import React from "react";

/**
 * Control
 * Wrapper موحّد لعناصر الفلاتر: أيقونة + input/select
 * يقلل الدوشة ويضمن محاذاة ثابتة بكل الصفحات.
 */
export default function Control({ icon: Icon, children, className = "", ...rest }) {
  return (
    <div className={`control ${className}`.trim()} {...rest}>
      {Icon ? <Icon size={18} /> : null}
      {children}
    </div>
  );
}
