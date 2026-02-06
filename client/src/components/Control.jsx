import React from "react";

/**
 * Control
 * Wrapper موحّد لعناصر الفלאتر: أيقونة + input/select
 * يقلل الدوشة ويضמ محاذاة ثابتة بكل כיתהحات.
 */
export default function Control({ icon: Icon, children, className = "", ...rest }) {
  return (
    <div className={`control ${className}`.trim()} {...rest}>
      {Icon ? <Icon size={18} /> : null}
      {children}
    </div>
  );
}
