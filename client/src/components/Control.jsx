import React from "react";

/**
 * Control
 * Wrapper No: + input/select
 * .
 */
export default function Control({ icon: Icon, children, className = "", ...rest }) {
 return (
 <div className={`control ${className}`.trim()} {...rest}>
 {Icon ? <Icon size={18} /> : null}
 {children}
 </div>
 );
}
