import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

/**
 * ModernSelect
 * Custom dropdown (not native <select>) so the opened menu can be styled.
 * Portal-based to avoid clipping inside overflow containers.
 */
export default function ModernSelect({
 value,
 onChange,
 options,
 placeholder = "",
 disabled = false,
 className = "",
 /** if true, renders without outer border/padding (useful inside Control) */
 bare = false,
 /** 'content' = fit to text, 'trigger' = match trigger width */
 menuWidth = "content",
 minMenuWidth = 140,
 maxMenuWidth = 420,
}) {
 const triggerRef = useRef(null);
 const menuRef = useRef(null);
 const [open, setOpen] = useState(false);
 const [pos, setPos] = useState({ top: 0, left: 0, right: 0, width: 0 });

 const dir = (typeof document !== "undefined" && document?.documentElement?.dir) || "ltr";
 const isRTL = dir.toLowerCase() === "rtl";

 const selected = useMemo(() => {
 return (options || []).find((o) => String(o.value) === String(value));
 }, [options, value]);

 function computePos() {
 const el = triggerRef.current;
 if (!el) return;
 const r = el.getBoundingClientRect();
 const gap = 6;
 const top = Math.round(r.bottom + gap);
 const left = Math.round(r.left);
 const right = Math.round(window.innerWidth - r.right);
 const width = Math.round(r.width);
 setPos({ top, left, right, width });
 }

 useEffect(() => {
 if (!open) return;
 computePos();
 const onScroll = () => computePos();
 const onResize = () => computePos();
 window.addEventListener("scroll", onScroll, true);
 window.addEventListener("resize", onResize);
 return () => {
 window.removeEventListener("scroll", onScroll, true);
 window.removeEventListener("resize", onResize);
 };
 }, [open]);

 useEffect(() => {
 if (!open) return;
 const onDown = (e) => {
 const t = e.target;
 if (triggerRef.current?.contains(t)) return;
 if (menuRef.current?.contains(t)) return;
 setOpen(false);
 };
 document.addEventListener("mousedown", onDown);
 return () => document.removeEventListener("mousedown", onDown);
 }, [open]);

 const triggerCls = [
 "modernSelect",
 bare ? "modernSelect--bare" : "",
 disabled ? "modernSelect--disabled" : "",
 open ? "modernSelect--open" : "",
 className,
 ]
 .filter(Boolean)
 .join(" ");

 const menuStyle = {
 position: "fixed",
 top: pos.top,
 zIndex: 2000,
 ...(isRTL ? { right: pos.right } : { left: pos.left }),
 width: menuWidth === "trigger" ? pos.width : "max-content",
 minWidth: menuWidth === "trigger" ? pos.width : minMenuWidth,
 maxWidth: maxMenuWidth,
 };

 return (
 <>
 <button
 type="button"
 ref={triggerRef}
 className={triggerCls}
 onClick={() => {
 if (disabled) return;
 if (!open) computePos();
 setOpen((v) => !v);
 }}
 aria-haspopup="listbox"
 aria-expanded={open}
 >
 <span className="modernSelect__label">
 {selected?.label ?? placeholder}
 </span>
 <ChevronDown size={16} className="modernSelect__chev" />
 </button>

 {open
 ? createPortal(
 <div ref={menuRef} className="modernSelectMenu" style={menuStyle} role="listbox">
 {(options || []).map((opt) => {
 const active = String(opt.value) === String(value);
 return (
 <button
 type="button"
 key={String(opt.value)}
 disabled={!!opt?.disabled}
 className={`modernSelectMenu__item ${active ? "is-active" : ""} ${opt?.disabled ? "is-disabled" : ""}`}
 onClick={() => {
 if (opt?.disabled) return;
 onChange?.(opt.value);
 setOpen(false);
 }}
 role="option"
 aria-selected={active}
 >
 <span className="modernSelectMenu__text">{opt.label}</span>
 {active ? <Check size={16} className="modernSelectMenu__check" /> : null}
 </button>
 );
 })}
 </div>,
 document.body
 )
 : null}
 </>
 );
}