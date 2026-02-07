import React from "react";

export default class ErrorBoundary extends React.Component {
 constructor(props) {
 super(props);
 this.state = { hasError: false, error: null };
 }

 static getDerivedStateFromError(error) {
 return { hasError: true, error };
 }

 componentDidCatch(error, info) {
 console.error("UI Crash:", error, info);
 }

 render() {
 if (this.state.hasError) {
 return (
 <div className="container" style={{ paddingTop: 24 }}>
 <div className="card">
 <div className="h1">صار خطأ بالواجهة</div>
 <div className="muted" style={{ marginTop: 8 }}>
 Console .
 </div>
 <pre
 style={{
 marginTop: 12,
 direction: "ltr",
 whiteSpace: "pre-wrap",
 background: "#f7f7f7",
 borderRadius: 12,
 padding: 12,
 }}
 >
 {String(this.state.error?.message || this.state.error)}
 </pre>
 </div>
 </div>
 );
 }
 return this.props.children;
 }
}
