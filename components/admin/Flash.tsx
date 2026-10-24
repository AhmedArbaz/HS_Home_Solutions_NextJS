type SP = { [key: string]: string | string[] | undefined };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function Flash({ searchParams }: { searchParams: SP }) {
  const msg = one(searchParams.msg);
  const err = one(searchParams.err);
  if (!msg && !err) return null;
  return <div className={`flash ${err ? 'flash-err' : 'flash-ok'}`}>{err || msg}</div>;
}
