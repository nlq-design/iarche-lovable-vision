import { lazy, Suspense } from 'react';
import { EditorSkeleton } from './EditorSkeleton';
import 'react-quill/dist/quill.snow.css';

// Lazy load React Quill
const ReactQuillLazy = lazy(() => import('react-quill'));

interface LazyQuillProps {
  value: string;
  onChange: (value: string) => void;
  modules?: any;
  formats?: string[];
  placeholder?: string;
  className?: string;
}

export const LazyQuill = ({ value, onChange, modules, formats, placeholder, className }: LazyQuillProps) => {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <ReactQuillLazy
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className={className}
      />
    </Suspense>
  );
};
