// IconButton.jsx
import React from "react";

/**
 * IconButton
 * 3 :
 * 1) icon={Users} (lucide forwardRef object) ✅
 * 2) icon={<Users size={18}/>} (React element) ✅
 * 3) icon={() => <svg.../>} (function component) ✅
 */
export default function IconButton({
 icon,
 children,
 className = "",
 title,
 ariaLabel,
 onClick,
 type = "button",
 disabled = false,
 variant = "ghost", // ghost | soft | solid | primary | danger
 size = "md", // sm | md | lg
 ...rest
}) {
 const iconSize = size === "sm" ? 16 : size === "lg" ? 20 : 18;

 // Backwards-compatible behavior:
 // Many places use <IconButton><Pencil/></IconButton> (icon as children).
 // If icon prop is not provided and children is a single React element,
 // treat it as the icon (icon-only button).
 const childIsIconElement =
 !icon && React.isValidElement(children) && typeof children.type !== "string";

 const isIconOnly =
 (children == null || children === false) || childIsIconElement;

 let iconNode = null;
 let textNode = isIconOnly ? null : children;

 const normalizeIconElement = (el) => {
 if (!React.isValidElement(el)) return el;
 // Most lucide icons accept `size`. If the element already has `size`, keep it.
 if (el.props && el.props.size != null) return el;
 return React.cloneElement(el, { size: iconSize });
 };

 // 0) icon as children (legacy)
 if (childIsIconElement) {
 iconNode = normalizeIconElement(children);
 }
 // 1) icon prop is a ready element
 else if (React.isValidElement(icon)) {
 iconNode = normalizeIconElement(icon);
 }
 // 2) icon prop is a function component
 else if (typeof icon === "function") {
 const IconFn = icon;
 iconNode = <IconFn size={iconSize} />;
 }
 // 3) icon prop is a lucide forwardRef object
 else if (icon && typeof icon === "object" && icon.$$typeof && icon.render) {
 iconNode = React.createElement(icon, { size: iconSize });
 }

 const base = "iconButton";
 const sizeCls = size === "sm" ? "iconButton--sm" : size === "lg" ? "iconButton--lg" : "";
 const normalizedVariant =
 variant === "primary" ? "solid" : variant;
 const variantCls =
 normalizedVariant === "solid"
 ? "iconButton--solid"
 : normalizedVariant === "soft"
 ? "iconButton--soft"
 : normalizedVariant === "danger"
 ? "iconButton--danger"
 : "iconButton--ghost";
 const modeCls = isIconOnly
 ? "iconButton--iconOnly"
 : "iconButton--withText";

 return (
 <button
 type={type}
 className={`${base} ${sizeCls} ${variantCls} ${modeCls} ${className}`}
 title={title}
 aria-label={ariaLabel || title}
 onClick={onClick}
 disabled={disabled}
 {...rest}
 >
 <span className="iconButton__icon" aria-hidden="true">
 {iconNode}
 </span>
 {!isIconOnly && <span className="iconButton__text">{textNode}</span>}
 </button>
 );
}
