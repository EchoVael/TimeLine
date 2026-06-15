import type { ComponentType, ButtonHTMLAttributes } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ComponentType<{ "aria-hidden"?: boolean; size?: number }>;
  label: string;
}

export function IconButton({
  icon: Icon,
  label,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      aria-label={label}
      className={`iconButton ${props.className ?? ""}`}
      title={label}
      type={type}
    >
      <Icon aria-hidden size={17} />
    </button>
  );
}
