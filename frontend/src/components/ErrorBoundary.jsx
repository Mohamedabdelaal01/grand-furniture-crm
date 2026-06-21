import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * ErrorBoundary — catches render/runtime crashes in the subtree and shows a
 * styled fallback instead of a blank white screen. React error boundaries
 * must be class components.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-6" dir="rtl">
        <div className="card p-10 text-center max-w-md border-rose-500/20 bg-rose-500/5">
          <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-rose-500" />
          </div>
          <h3 className="text-xl font-black text-foreground mb-3">حصل خطأ غير متوقع</h3>
          <p className="text-muted mb-8 text-sm leading-relaxed">
            عذراً، فيه مشكلة في عرض الصفحة. جرّب ترجع للوحة التحكم — لو المشكلة فضلت
            كلّم الدعم الفني.
          </p>
          <button onClick={this.handleReload} className="btn-primary w-full py-4">
            الرجوع للوحة التحكم
          </button>
        </div>
      </div>
    );
  }
}
