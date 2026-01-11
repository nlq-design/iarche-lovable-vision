import { lazy, Suspense } from 'react';
import { EditorSkeleton } from './EditorSkeleton';

// Lazy load React Quill with CSS
const ReactQuillLazy = lazy(() => 
  import('react-quill').then(module => {
    // Import CSS dynamically alongside the component
    import('react-quill/dist/quill.snow.css');
    return module;
  })
);

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
