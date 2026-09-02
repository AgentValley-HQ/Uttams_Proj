import { useState, useEffect, useMemo } from 'react';
import Logo from './Logo.jsx';
import { CONFIG, FLAGSHIP, POOL } from './constants.js';

const linkHref = (l) => (/^https?:\/\//.test(l) ? l : 'https://' + l);
const profileHref = () => linkHref(CONFIG.hostLinkedIn);
const communityHref = () => linkHref(CONFIG.communityLink);
const linkLabel = () => CONFIG.communityLink.replace(/^https?:\/\//, '');

const RECENT_KEY = 'sps-recent-points';
const readRecent = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
};
const writeRecent = (arr) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, 9))); } catch {}
};

const shuffle = (a) => {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

function pickPostSet(pickedIdxs) {
  const recent = readRecent();
  const ticked = pickedIdxs.slice();
  const freshTicked = shuffle(ticked.filter((i) => recent.indexOf(i) < 0));
  let lead = freshTicked.slice(0, 2);
  if (lead.length < 2) {
    lead = lead.concat(shuffle(ticked.filter((i) => lead.indexOf(i) < 0))).slice(0, 2);
  }
  const rest = POOL.map((_, i) => i).filter((i) => lead.indexOf(i) < 0 && ticked.indexOf(i) < 0);
  const fresh = shuffle(rest.filter((i) => recent.indexOf(i) < 0));
  const filler = (fresh.length ? fresh : shuffle(rest)).slice(0, 3 - lead.length);
  const set = lead.concat(filler);
  writeRecent(set.concat(recent));
  return set;
}

function pickStorySet() {
  const recent = readRecent();
  const all = shuffle(POOL.map((_, i) => i));
  const fresh = all.filter((i) => recent.indexOf(i) < 0);
  const picked = (fresh.length >= 3 ? fresh : fresh.concat(all.filter((i) => fresh.indexOf(i) < 0))).slice(0, 3);
  writeRecent(picked.concat(recent));
  return picked;
}

function templatePost(picks, customText) {
  const host = CONFIG.hostName, session = CONFIG.sessionTitle;
  const parts = [];
  parts.push(
    `I attended the ${session} with ${host} last week.\n\nI went in expecting prompts and chatbot tricks.\n\nI came out with a ladder: workflow, automation, system, product.`
  );
  if (picks.length) {
    parts.push('Here is what stood out:\n\n' + picks.map((p, i) => `${i + 1}. ${p.title}.\n${p.detail}`).join('\n\n'));
  }
  if (customText.trim()) parts.push(customText.trim());
  parts.push('Learning it changed nothing. Building one thing with it changed the week.');
  parts.push(`If you also want to grow 10x, ${host} runs a free WhatsApp community where he shares daily updates around AI.\n\nJoin here: ${communityHref()}`);
  parts.push('#AIFirst #AIWorkflows #UttamGupta');
  return parts.join('\n\n');
}

function asHtml(text) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text.split('\n').map((l) => (l.trim() ? `<p>${esc(l)}</p>` : '<p><br></p>')).join('');
}

async function copyRich(text) {
  const html = asHtml(text);
  try {
    const host = document.createElement('div');
    host.setAttribute('contenteditable', 'true');
    Object.assign(host.style, { position: 'fixed', top: '0', left: '0', opacity: '0', whiteSpace: 'pre-wrap' });
    host.innerHTML = html;
    document.body.appendChild(host);
    const range = document.createRange();
    range.selectNodeContents(host);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const onCopy = (e) => {
      e.clipboardData.setData('text/plain', text);
      e.clipboardData.setData('text/html', html);
      e.preventDefault();
    };
    document.addEventListener('copy', onCopy, true);
    const ok = document.execCommand('copy');
    document.removeEventListener('copy', onCopy, true);
    sel.removeAllRanges();
    document.body.removeChild(host);
    if (ok) return true;
  } catch {}
  try {
    if (window.ClipboardItem && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new window.ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
      return true;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  return false;
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = t;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(src) {
  if (!src) return Promise.resolve(null);
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

async function renderStoryPng({ picks, photoDataUrl }) {
  try { await document.fonts.ready; } catch {}
  const W = 1080, H = 1920, pad = 80;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#0d0d0d';
  x.fillRect(0, 0, W, H);

  const img = photoDataUrl ? await loadImage(photoDataUrl) : null;
  if (img) {
    const sc = Math.max(W / img.width, H / img.height);
    x.drawImage(img, (W - img.width * sc) / 2, (H - img.height * sc) / 2, img.width * sc, img.height * sc);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(13,13,13,.62)');
    g.addColorStop(1, 'rgba(13,13,13,.93)');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
  }
  x.strokeStyle = 'rgba(255,104,32,.09)';
  x.lineWidth = 2;
  for (let i = 120; i < W; i += 120) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
  for (let j = 120; j < H; j += 120) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }

  const round = (px, py, w, h, r) => {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  };

  let y = 168;
  x.textBaseline = 'alphabetic';
  x.font = '500 30px "JetBrains Mono", monospace';
  if ('letterSpacing' in x) x.letterSpacing = '6px';
  x.fillStyle = '#ff6820';
  x.fillText('SESSION NOTES', pad, y);
  if ('letterSpacing' in x) x.letterSpacing = '0px';

  // Top-right: SVG-style modernschool.ai wordmark drawn with canvas primitives
  const logoY = y - 34, logoH = 46;
  x.save();
  const cx = W - pad - 6, cy = logoY + logoH / 2;
  x.strokeStyle = '#ff6820';
  x.lineWidth = 5;
  x.lineCap = 'round';
  for (let a = 0; a < 4; a++) {
    const th = (a * Math.PI) / 4;
    const dx = Math.cos(th) * (logoH / 2 - 4);
    const dy = Math.sin(th) * (logoH / 2 - 4);
    x.beginPath();
    x.moveTo(cx - dx, cy - dy);
    x.lineTo(cx + dx, cy + dy);
    x.stroke();
  }
  x.restore();
  x.fillStyle = '#ffffff';
  x.font = '600 32px "Space Grotesk", sans-serif';
  const wm = 'modernschool';
  const wmDot = '.ai';
  const wmWidth = x.measureText(wm).width;
  const dotWidth = x.measureText(wmDot).width;
  const wmStartX = W - pad - logoH - 14 - wmWidth - dotWidth;
  x.fillText(wm, wmStartX, logoY + 32);
  x.fillStyle = '#ff6820';
  x.fillText(wmDot, wmStartX + wmWidth, logoY + 32);

  y += 176;
  x.fillStyle = '#ffffff';
  x.font = '700 128px "Space Grotesk", sans-serif';
  x.fillText('I did not just', pad, y);
  y += 126;
  x.fillText('learn it.', pad, y);
  x.fillStyle = '#ff6820';
  x.fillRect(pad, y + 30, x.measureText('learn it.').width, 14);
  y += 140;

  const titles = picks.slice(0, 3).map((p) => p.title);
  const boxW = W - pad * 2;
  const numW = 96;
  const textW = boxW - 88 - numW;
  x.font = '700 46px "Space Grotesk", sans-serif';
  const wrapped = titles.map((t) => wrapText(x, t, textW));
  const cardTop = [], cardH = [];
  let cy0 = y;
  wrapped.forEach((lines) => {
    const h = Math.max(168, 88 + lines.length * 56);
    cardTop.push(cy0); cardH.push(h);
    cy0 += h + 28;
  });
  const footerH = 268;
  const footerTop = H - pad - footerH;
  const overflow = cy0 - 28 - (footerTop - 56);
  const shift = overflow > 0 ? overflow : 0;

  wrapped.forEach((lines, i) => {
    const top = cardTop[i] - shift, h = cardH[i];
    x.fillStyle = '#1a1a1a';
    round(pad, top, boxW, h, 20); x.fill();
    x.strokeStyle = '#232323'; x.lineWidth = 3;
    round(pad + 1.5, top + 1.5, boxW - 3, h - 3, 20); x.stroke();
    x.fillStyle = '#ff6820';
    round(pad, top, 12, h, 6); x.fill();
    x.fillRect(pad + 6, top, 6, h);
    x.font = '700 56px "Space Grotesk", sans-serif';
    x.fillText('0' + (i + 1), pad + 44, top + 76);
    x.fillStyle = '#ffffff';
    x.font = '700 46px "Space Grotesk", sans-serif';
    lines.forEach((l, j) => x.fillText(l, pad + 44 + numW, top + 76 + j * 56));
  });

  x.fillStyle = '#141414';
  round(pad, footerTop, boxW, footerH, 24); x.fill();
  x.strokeStyle = '#ff6820'; x.lineWidth = 3;
  round(pad + 1.5, footerTop + 1.5, boxW - 3, footerH - 3, 24); x.stroke();

  const tx = pad + 46;
  x.font = '500 26px "JetBrains Mono", monospace';
  if ('letterSpacing' in x) x.letterSpacing = '5px';
  x.fillStyle = '#ff6820';
  x.fillText('SESSION BY', tx, footerTop + 76);
  if ('letterSpacing' in x) x.letterSpacing = '0px';
  x.fillStyle = '#ffffff';
  x.font = '700 58px "Space Grotesk", sans-serif';
  x.fillText(CONFIG.hostName, tx, footerTop + 152);
  x.fillStyle = '#b3b3b3';
  x.font = '400 32px Archivo, sans-serif';
  let sy = footerTop + 206;
  wrapText(x, `Free WhatsApp community: ${linkLabel()}`, boxW - 92).forEach((l) => {
    x.fillText(l, tx, sy);
    sy += 42;
  });

  return c.toDataURL('image/png');
}

export default function App() {
  const [picked, setPicked] = useState(FLAGSHIP.slice(0, 3));
  const [postPicked, setPostPicked] = useState(FLAGSHIP.slice(0, 3));
  const [storyPicked, setStoryPicked] = useState(FLAGSHIP.slice(0, 3));
  const [custom, setCustom] = useState('');
  const [tab, setTab] = useState('LinkedIn post');
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiPost, setAiPost] = useState('');
  const [edited, setEdited] = useState(null);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(0);
  const [capCopied, setCapCopied] = useState(0);
  const [saved, setSaved] = useState(0);
  const [storyImg, setStoryImg] = useState('');
  const [imgName, setImgName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { setStoryPicked(pickStorySet()); }, []);

  const flash = (setter) => {
    setter(Date.now());
    setTimeout(() => setter(0), 1800);
  };

  const activePostPicks = useMemo(() => {
    const idxs = postPicked.length ? postPicked : picked.slice(0, 3);
    return idxs.map((i) => POOL[i]).filter(Boolean);
  }, [postPicked, picked]);

  const storyPicks = useMemo(
    () => storyPicked.map((i) => POOL[i]).filter(Boolean),
    [storyPicked]
  );

  const postText = useMemo(() => {
    if (edited !== null) return edited;
    if (aiPost) return aiPost;
    return templatePost(activePostPicks, custom);
  }, [edited, aiPost, activePostPicks, custom]);

  const captionText = useMemo(
    () =>
      `Notes from the ${CONFIG.sessionTitle} with ${CONFIG.hostName}.\n\n` +
        `Free WhatsApp community: ${communityHref()}\n\n#AIFirst #AIWorkflows #UttamGupta`,
    []
  );

  const generate = async () => {
    setError('');
    const nextPicks = pickPostSet(picked);
    setPostPicked(nextPicks);
    setGenerated(true);
    setLoading(true);
    setAiPost('');
    setEdited(null);
    setEditing(false);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: CONFIG.hostName,
          session: CONFIG.sessionTitle,
          community: communityHref(),
          picks: nextPicks.map((i) => POOL[i]),
          custom: custom.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setAiPost(data.post || '');
    } catch (e) {
      setError(e.message || 'Something went wrong writing the post.');
    } finally {
      setLoading(false);
    }
  };

  const shuffleStory = () => setStoryPicked(pickStorySet());

  const onImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      setStoryImg(String(r.result));
      setImgName(f.name);
    };
    r.readAsDataURL(f);
  };

  const downloadStory = async () => {
    const url = await renderStoryPng({ picks: storyPicks, photoDataUrl: storyImg });
    const a = document.createElement('a');
    a.href = url;
    a.download = 'session-story.png';
    a.click();
    flash(setSaved);
  };

  const copyAndOpenLinkedIn = async () => {
    const ok = await copyRich(postText);
    if (ok) flash(setCopied);
    // LinkedIn's compose deep-link. Text can't be pre-filled (LinkedIn strips
    // it), but this drops the user straight into the "Start a post" surface
    // on desktop and mobile web. Ctrl+V / Cmd+V after the tab opens.
    window.open(
      'https://www.linkedin.com/feed/?shareActive=true',
      '_blank',
      'noopener,noreferrer'
    );
  };

  const shareToInstagram = async () => {
    const url = await renderStoryPng({ picks: storyPicks, photoDataUrl: storyImg });
    // Always copy caption so they can paste it as a text sticker.
    await copyRich(captionText);
    flash(setCapCopied);
    // On mobile: use the native share sheet with the PNG. User picks
    // Instagram → the Story composer opens with the image already loaded.
    try {
      if (navigator.canShare && navigator.share) {
        const blob = await (await fetch(url)).blob();
        const file = new File([blob], 'session-story.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'My session story' });
          return;
        }
      }
    } catch {
      /* user cancelled or share failed — fall through to download */
    }
    // Desktop / share unsupported: download the PNG so they can move it to
    // their phone and post from the Instagram app there.
    const a = document.createElement('a');
    a.href = url;
    a.download = 'session-story.png';
    a.click();
    flash(setSaved);
  };

  const togglePick = (i) => {
    setPicked((prev) =>
      prev.indexOf(i) > -1 ? prev.filter((x) => x !== i) : prev.concat(i)
    );
  };

  const enoughPicked = picked.length >= 3;
  const countLabel = enoughPicked ? `${picked.length} selected` : `${picked.length} of 3`;
  const countColor = enoughPicked ? 'var(--text-accent)' : 'var(--av-grey-300)';
  const generateLabel = loading
    ? 'Writing your post…'
    : generated
    ? 'Rewrite my post'
    : 'Generate my post';

  const postBlocks = postText.split('\n\n');

  return (
    <div className="page">
      <div className="container header">
        <Logo height={34} />
      </div>

      <div className="container hero">
        <span className="eyebrow">You were in the room</span>
        <h1>
          <span className="line">
            The <span style={{ color: 'var(--text-accent)' }}>Top 1%</span> do not just learn.
          </span>
          <span className="line">
            They apply it, share it, and <span style={{ color: 'var(--text-accent)' }}>earn from it</span>.
          </span>
        </h1>
        <p>
          Everyone in that room learned the same thing. The ones who post it today are the ones
          people will pay next month.
        </p>
      </div>

      <div className="container grid">
        {/* LEFT column: input card */}
        <div className="card" style={{ padding: 32, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26, minWidth: 0 }}>
            <div className="session-pill">
              <span className="dot" />
              <span style={{ fontSize: 15, color: 'var(--av-grey-100)', overflowWrap: 'anywhere' }}>
                {CONFIG.sessionTitle} with {CONFIG.hostName}
              </span>
            </div>

            {tab === 'LinkedIn post' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-strong)' }}>
                      What landed for you
                    </span>
                    <span
                      style={{
                        flex: 'none',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: countColor,
                      }}
                    >
                      {countLabel}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
                    {FLAGSHIP.map((i) => {
                      const on = picked.indexOf(i) > -1;
                      return (
                        <div
                          key={i}
                          className={`checkbox-row${on ? ' on' : ''}`}
                          onClick={() => togglePick(i)}
                          role="checkbox"
                          aria-checked={on}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              togglePick(i);
                            }
                          }}
                        >
                          <span className="checkbox-box" />
                          <span
                            style={{
                              minWidth: 0,
                              fontSize: 14,
                              lineHeight: 1.5,
                              color: 'var(--av-grey-100)',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {POOL[i].title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--av-grey-300)' }}>
                    Pick at least three. Every generate also mixes in a point from the rest of the
                    session, so no two posts come out the same.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-strong)' }}>
                    In your own words
                  </span>
                  <textarea
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder="What did you feel about the session? Write it in your own way and it will be shaped into the post."
                    rows={7}
                  />
                </div>

                {error && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      background: 'rgba(229,72,77,.1)',
                      border: '1px solid rgba(229,72,77,.4)',
                      color: '#ffb0b3',
                      fontSize: 13,
                    }}
                  >
                    {error}
                  </div>
                )}

                <div style={{ paddingTop: 22, borderTop: '1px solid var(--border-hairline)' }}>
                  <button
                    className="btn btn-lg btn-full"
                    disabled={loading || !enoughPicked}
                    onClick={generate}
                  >
                    {loading && <span className="spinner" />}
                    {generateLabel}
                  </button>
                </div>
              </>
            )}

            {tab === 'Instagram story' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-strong)' }}>
                    Add your own photo (optional)
                  </span>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--av-grey-100)' }}>
                    A shot from the session sits behind your three points.
                  </p>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 6,
                      background: 'var(--surface-inset)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        minWidth: 0,
                        fontSize: 14,
                        color: 'var(--av-grey-100)',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {imgName || 'No photo added'}
                    </span>
                    <span
                      style={{
                        flex: 'none',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'var(--text-accent)',
                      }}
                    >
                      Choose
                    </span>
                    <input type="file" accept="image/*" onChange={onImage} style={{ display: 'none' }} />
                  </label>
                  {storyImg && (
                    <button
                      onClick={() => { setStoryImg(''); setImgName(''); }}
                      style={{
                        alignSelf: 'flex-start',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontFamily: 'var(--font-body)',
                        fontSize: 13,
                        color: 'var(--av-grey-300)',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
                <button className="btn btn-lg btn-full" onClick={shuffleStory}>
                  Shuffle my points
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT column: tabs + output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              {['LinkedIn post', 'Instagram story'].map((label) => (
                <button
                  key={label}
                  className={`tab-btn${tab === label ? ' active' : ''}`}
                  onClick={() => setTab(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tab === 'LinkedIn post' && generated && (
            <div className="card" style={{ padding: 30, minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
                {loading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '40px 0' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        color: 'var(--text-accent)',
                      }}
                    >
                      Writing your post
                    </span>
                    <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: 'var(--av-grey-100)' }}>
                      Taking your notes and writing the post out in your voice.
                    </p>
                  </div>
                )}
                {!loading && !editing && (
                  <div className="post-blocks">
                    {postBlocks.map((text, i) => (
                      <p key={i}>{text}</p>
                    ))}
                  </div>
                )}
                {!loading && editing && (
                  <textarea
                    value={postText}
                    onChange={(e) => setEdited(e.target.value)}
                    rows={16}
                    style={{
                      border: '1px solid var(--border-accent)',
                      fontSize: 16,
                      lineHeight: 1.65,
                    }}
                  />
                )}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    alignItems: 'center',
                    paddingTop: 20,
                    borderTop: '1px solid var(--border-hairline)',
                  }}
                >
                  <button className="btn" onClick={copyAndOpenLinkedIn}>
                    {copied ? 'Copied. LinkedIn opened →' : 'Copy & open LinkedIn'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setEditing((v) => !v);
                      if (edited === null) setEdited(postText);
                    }}
                  >
                    {editing ? 'Done editing' : 'Edit text'}
                  </button>
                </div>
                <ol className="steps">
                  <li>
                    <strong>Copy &amp; open LinkedIn.</strong> One click. Your post is copied,
                    LinkedIn opens in a new tab.
                  </li>
                  <li>
                    <strong>Paste the copied post</strong> into the compose box.
                  </li>
                  <li>
                    <strong>Tag{' '}
                      <a href={profileHref()} target="_blank" rel="noreferrer">
                        {CONFIG.hostName}
                      </a>
                    </strong>{' '}before you post. He reads every one.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {tab === 'Instagram story' && (
            <div className="card" style={{ padding: 30, minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start', minWidth: 0 }}>
                <div className="story-frame">
                  <StoryPreview picks={storyPicks} photoDataUrl={storyImg} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4, minWidth: 220, flex: 1 }}>
                  <button className="btn" onClick={shareToInstagram}>
                    {capCopied ? 'Shared / caption copied ✓' : 'Share to Instagram'}
                  </button>
                  <button className="btn btn-ghost" onClick={downloadStory}>
                    {saved ? 'PNG downloaded ✓' : 'Download PNG only'}
                  </button>
                  <p className="hint">
                    Best on a phone. On desktop, the PNG just downloads — send it
                    to yourself and post from the Instagram app.
                  </p>
                </div>
              </div>
              <ol className="steps" style={{ marginTop: 24 }}>
                <li>
                  <strong>Tap Share to Instagram</strong> on your phone. Your caption is
                  copied at the same time.
                </li>
                <li>
                  In the share sheet, pick <strong>Instagram → Add to Story</strong>. The
                  image loads straight into the story composer.
                </li>
                <li>
                  Add a text sticker, <strong>paste your caption</strong>, and tag{' '}
                  <strong style={{ color: 'var(--text-accent)' }}>{CONFIG.hostInstagram}</strong>.
                </li>
                <li>
                  <strong>Post.</strong> He re-shares every one.
                </li>
              </ol>
            </div>
          )}

          {tab === 'LinkedIn post' && !generated && (
            <div className="card card-outline" style={{ padding: 56, minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--av-grey-300)',
                  }}
                >
                  Nothing generated yet
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: 17,
                    lineHeight: 1.6,
                    color: 'var(--av-grey-100)',
                    maxWidth: '38ch',
                  }}
                >
                  Hit generate and your post appears here, ready to copy.
                </p>
              </div>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 18,
              padding: '20px 24px',
              border: '1px solid var(--border-hairline)',
              borderRadius: 14,
            }}
          >
            <span
              style={{
                flex: 1,
                minWidth: 220,
                fontSize: 15,
                lineHeight: 1.6,
                color: 'var(--av-grey-100)',
              }}
            >
              Free WhatsApp community. Daily updates around AI.
            </span>
            <a className="btn btn-outline" href={communityHref()} target="_blank" rel="noreferrer">
              Join
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StoryPreview({ picks, photoDataUrl }) {
  const bgStyle = photoDataUrl
    ? {
        position: 'absolute',
        inset: 0,
        backgroundImage: `linear-gradient(rgba(13,13,13,.62), rgba(13,13,13,.93)), url("${photoDataUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { position: 'absolute', inset: 0 };
  const storyPicksSafe = picks.slice(0, 3);
  return (
    <div className="story-inner">
      <div style={bgStyle} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(to right, rgba(255,104,32,.09) 2px, transparent 2px), linear-gradient(to bottom, rgba(255,104,32,.09) 2px, transparent 2px)',
          backgroundSize: '120px 120px',
        }}
      />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 30,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#ff6820',
          }}
        >
          Session notes
        </span>
        <Logo height={46} />
      </div>
      <h2
        style={{
          position: 'relative',
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 128,
          lineHeight: 0.98,
          letterSpacing: '-0.03em',
          color: '#ffffff',
        }}
      >
        I did not just
        <br />
        <span
          style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            borderBottom: '14px solid #ff6820',
            paddingBottom: 14,
          }}
        >
          learn it.
        </span>
      </h2>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
        {storyPicksSafe.map((p, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 32,
              alignItems: 'flex-start',
              minWidth: 0,
              background: '#1a1a1a',
              border: '3px solid #232323',
              borderLeft: '12px solid #ff6820',
              borderRadius: 20,
              padding: 44,
            }}
          >
            <span
              style={{
                flex: 'none',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 56,
                lineHeight: 1,
                color: '#ff6820',
              }}
            >
              {'0' + (i + 1)}
            </span>
            <span
              style={{
                minWidth: 0,
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 46,
                lineHeight: 1.22,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                overflowWrap: 'anywhere',
              }}
            >
              {p.title}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: '#141414',
          border: '3px solid #ff6820',
          borderRadius: 24,
          padding: '42px 46px',
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 26,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#ff6820',
          }}
        >
          Session by
        </span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 58,
            lineHeight: 1,
            letterSpacing: '-0.025em',
            color: '#ffffff',
          }}
        >
          {CONFIG.hostName}
        </span>
        <span
          style={{
            fontSize: 32,
            lineHeight: 1.35,
            color: '#b3b3b3',
            overflowWrap: 'anywhere',
          }}
        >
          Free WhatsApp community: {linkLabel()}
        </span>
      </div>
    </div>
  );
}
