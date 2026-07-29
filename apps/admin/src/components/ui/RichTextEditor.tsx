import { useMemo, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote'],
  ['link'],
  ['clean'],
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 150,
}: RichTextEditorProps) {
  const [mode, setMode] = useState<'visual' | 'html'>('visual');

  const modules = useMemo(
    () => ({
      toolbar: TOOLBAR_OPTIONS,
    }),
    []
  );

  return (
    <div className={styles.wrapper} style={{ '--editor-min-height': `${minHeight}px` } as React.CSSProperties}>
      <div className={styles.modeBar}>
        <button
          type="button"
          className={`${styles.modeButton} ${mode === 'visual' ? styles.modeButtonActive : ''}`}
          onClick={() => setMode('visual')}
          title="Визуальный редактор"
        >
          Визуальный
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${mode === 'html' ? styles.modeButtonActive : ''}`}
          onClick={() => setMode('html')}
          title="Просмотр и правка HTML-исходника"
        >
          HTML
        </button>
      </div>

      {mode === 'visual' ? (
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          placeholder={placeholder}
        />
      ) : (
        <textarea
          className={styles.htmlTextarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
        />
      )}
    </div>
  );
}
