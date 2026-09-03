export default function Logo({ height = 34 }) {
  return (
    <img
      src="/logo.png"
      alt="modernschool.ai"
      style={{ height, width: 'auto', display: 'block', flex: 'none' }}
    />
  );
}
