import { useMemo, useRef, useState, useEffect } from 'react';

/**
 * Editor kode JavaScript ringan & mandiri (tanpa dependency baru).
 * Teknik klasik: <textarea> transparan di atas <pre> ber-highlight yang
 * di-scroll bersama. Mendukung nomor baris, Tab=2 spasi (+Shift+Tab outdent),
 * dan auto-close kurung/kutip.
 */

const KEYWORDS = new Set([
  'await', 'async', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
  'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'of',
  'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void',
  'while', 'with', 'yield',
]);
const LITERALS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Tokenizer JS sederhana: komentar, string, angka, identifier/keyword, sisanya.
const TOKEN_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^\\`])*`|'(?:\\.|[^\\'])*'|"(?:\\.|[^\\"])*")|(\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b)|([A-Za-z_$][\w$]*)/gi;

function highlight(code: string): string {
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(code)) !== null) {
    out += escapeHtml(code.slice(last, m.index));
    const [full, comment, str, num, ident] = m;
    if (comment != null) {
      out += `<span class="text-zinc-500 italic">${escapeHtml(comment)}</span>`;
    } else if (str != null) {
      out += `<span class="text-emerald-300">${escapeHtml(str)}</span>`;
    } else if (num != null) {
      out += `<span class="text-amber-300">${escapeHtml(num)}</span>`;
    } else if (ident != null) {
      const cls = KEYWORDS.has(ident)
        ? 'text-sky-400'
        : LITERALS.has(ident)
          ? 'text-purple-400'
          : null;
      out += cls ? `<span class="${cls}">${escapeHtml(ident)}</span>` : escapeHtml(ident);
    }
    last = m.index + full.length;
  }
  out += escapeHtml(code.slice(last));
  return out;
}

const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
}

export default function CodeEditor({ value, onChange, placeholder, minRows = 14, className = '' }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [focused, setFocused] = useState(false);

  const lineCount = useMemo(() => Math.max(value.split('\n').length, minRows), [value, minRows]);
  const html = useMemo(() => highlight(value) + '\n', [value]); // \n agar baris terakhir terender

  // Sinkronkan scroll highlight <pre> dengan <textarea> (khusus horizontal).
  function syncScroll() {
    if (preRef.current && taRef.current) {
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  }

  // Auto-grow vertikal: tinggi textarea = tinggi konten, supaya tak ada scroll
  // vertikal internal (gutter nomor baris selalu sinkron) — modal yang scroll.
  function autoGrow() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }
  useEffect(() => { autoGrow(); syncScroll(); }, [value]);

  function setValueWithCaret(next: string, caretStart: number, caretEnd = caretStart) {
    onChange(next);
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (ta) { ta.selectionStart = caretStart; ta.selectionEnd = caretEnd; }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget;
    const { selectionStart: s, selectionEnd: en, value: v } = ta;

    // Tab / Shift+Tab → indent 2 spasi
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        const lineStart = v.lastIndexOf('\n', s - 1) + 1;
        if (v.slice(lineStart, lineStart + 2) === '  ') {
          setValueWithCaret(v.slice(0, lineStart) + v.slice(lineStart + 2), Math.max(lineStart, s - 2), Math.max(lineStart, en - 2));
        }
      } else {
        setValueWithCaret(v.slice(0, s) + '  ' + v.slice(en), s + 2);
      }
      return;
    }

    // Enter → pertahankan indentasi baris sebelumnya (+2 jika baris dibuka kurung)
    if (e.key === 'Enter') {
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const indent = (v.slice(lineStart, s).match(/^[ \t]*/) || [''])[0];
      const extra = /[([{]$/.test(v.slice(0, s).trimEnd()) ? '  ' : '';
      e.preventDefault();
      const insert = '\n' + indent + extra;
      setValueWithCaret(v.slice(0, s) + insert + v.slice(en), s + insert.length);
      return;
    }

    // Auto-close kurung & kutip
    if (PAIRS[e.key] && s === en) {
      e.preventDefault();
      const close = PAIRS[e.key];
      setValueWithCaret(v.slice(0, s) + e.key + close + v.slice(en), s + 1);
      return;
    }
  }

  return (
    <div
      className={`relative rounded-xl border bg-zinc-950 overflow-hidden ${focused ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-zinc-700'} ${className}`}
    >
      <div className="flex">
        {/* Gutter nomor baris */}
        <pre
          aria-hidden
          className="select-none text-right text-zinc-600 py-3 pl-3 pr-2 text-[12.5px] font-mono leading-[1.6]"
        >
          {Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')}
        </pre>

        {/* Area kode */}
        <div className="relative flex-1 overflow-hidden">
          <pre
            ref={preRef}
            aria-hidden
            className="absolute inset-0 m-0 overflow-hidden py-3 px-3 text-[12.5px] font-mono leading-[1.6] text-zinc-100 whitespace-pre pointer-events-none"
            style={{ tabSize: 2 }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            spellCheck={false}
            placeholder={placeholder}
            className="relative block w-full resize-none overflow-x-auto overflow-y-hidden py-3 px-3 text-[12.5px] font-mono leading-[1.6] bg-transparent text-transparent caret-white placeholder:text-zinc-500 whitespace-pre focus:outline-none"
            style={{ tabSize: 2, minHeight: `${minRows * 1.6 + 1.5}em` }}
          />
        </div>
      </div>
    </div>
  );
}
