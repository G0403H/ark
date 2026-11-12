import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface CustomSelectProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  variant?: "default" | "compact";
  fullWidth?: boolean;
  style?: React.CSSProperties;
  id?: string;
  disabled?: boolean;
}

export function CustomSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder,
  className = "",
  variant = "default",
  fullWidth = false,
  style,
  id,
  disabled = false,
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder || String(value || "");

  useEffect(() => {
    if (!open) return;

    // Check boundaries to prevent horizontal overflow on mobile screens
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const menuWidth = 260;
      if (rect.left + menuWidth > window.innerWidth - 12) {
        setAlignRight(true);
      } else {
        setAlignRight(false);
      }
    }

    // Scroll active item into view
    if (listRef.current) {
      const activeEl = listRef.current.querySelector<HTMLElement>('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const currentIndex = options.findIndex((o) => o.value === value);
        const nextIndex = (currentIndex + 1) % options.length;
        onChange(options[nextIndex].value);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const currentIndex = options.findIndex((o) => o.value === value);
        const prevIndex = (currentIndex - 1 + options.length) % options.length;
        onChange(options[prevIndex].value);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, options, value, onChange]);

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${variant === "compact" ? "custom-select-compact" : ""} ${fullWidth ? "custom-select-full" : ""} ${className}`}
      style={style}
    >
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        className={`custom-select-trigger ${open ? "is-open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="custom-select-value">{displayLabel}</span>
        <ChevronDown
          size={variant === "compact" ? 13 : 15}
          className={`custom-select-chevron ${open ? "is-rotated" : ""}`}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className={`custom-select-dropdown ${alignRight ? "align-right" : "align-left"}`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-active={isSelected ? "true" : "false"}
                className={`custom-select-option ${isSelected ? "is-selected" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span className="custom-select-option-text">
                  {opt.icon && <span className="custom-select-option-icon">{opt.icon}</span>}
                  {opt.label}
                </span>
                {isSelected && (
                  <Check
                    size={16}
                    strokeWidth={2.4}
                    className="custom-select-check"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
