export default function StatusBadge({ status }) {
  const config = {
    paid: {
      bg: 'bg-[#33D69F]/10 dark:bg-[#33D69F]/10',
      dot: 'bg-[#33D69F]',
      text: 'text-[#33D69F]',
      label: 'Paid',
    },
    pending: {
      bg: 'bg-[#FF8F00]/10 dark:bg-[#FF8F00]/10',
      dot: 'bg-[#FF8F00]',
      text: 'text-[#FF8F00]',
      label: 'Pending',
    },
    draft: {
      bg: 'bg-[#373B53]/10 dark:bg-[#DFE3FA]/10',
      dot: 'bg-[#373B53] dark:bg-[#DFE3FA]',
      text: 'text-[#373B53] dark:text-[#DFE3FA]',
      label: 'Draft',
    },
  }

  const { bg, dot, text, label } = config[status] || config.draft

  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-[11px] rounded-md font-bold text-[12px] leading-none ${bg} ${text}`}
      role="status"
      aria-label={`Status: ${label}`}
    >
      <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  )
}
