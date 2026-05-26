import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

/**
 * NotFound — friendly 404 instead of a silent redirect, so the user knows
 * the page doesn't exist rather than being bounced with no feedback.
 */
export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-dark-950 p-6" dir="rtl">
      <div className="card p-10 text-center max-w-md">
        <div className="w-20 h-20 bg-primary-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Compass className="w-10 h-10 text-primary-400" />
        </div>
        <p className="text-5xl font-black text-white mb-2">404</p>
        <h3 className="text-lg font-black text-white mb-3">الصفحة دي مش موجودة</h3>
        <p className="text-dark-400 mb-8 text-sm leading-relaxed">
          الرابط اللي دخلت عليه مش صحيح أو الصفحة اتنقلت.
        </p>
        <Link to="/" className="btn-primary w-full py-4 inline-block">
          الرجوع للوحة التحكم
        </Link>
      </div>
    </div>
  );
}
