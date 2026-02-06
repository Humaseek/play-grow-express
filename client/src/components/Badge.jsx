import React from "react";

export default function Badge({ variant = "info", children }) {
  return <span className={`badge ${variant}`}>{children}</span>;
}
