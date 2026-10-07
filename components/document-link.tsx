export function DocumentLink({ id }: { id: string }) {
  return (
    <a
      href={`/api/documents/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-[#087f72]"
    >
      Buka
    </a>
  )
}
