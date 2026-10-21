import { describe, it, expect } from 'vitest';
import { highlightHtml } from '../src/lib/highlight.js';

describe('highlightHtml', () => {
  it.each([
    ['tsx', 'export default function Page() { return <div className="a">{x}</div>; }', 'hljs-keyword'],
    ['typescript', 'const x: number = 1;', 'hljs-keyword'],
    ['php', '<?php Route::get("/", fn () => view("home"));', 'hljs-string'],
    ['sql', "SELECT id FROM users WHERE name = 'a';", 'hljs-keyword'],
    ['blade', '<div>@if($a) {{ $a }} @endif</div>', 'hljs-'],
    ['env', 'APP_KEY=base64:abc\nDB_HOST=127.0.0.1', 'hljs-'],
    ['bash', 'composer require laravel/sanctum # hi', 'hljs-comment'],
  ])('%s is highlighted', (lang, code, cls) => {
    expect(highlightHtml(code, lang)).toContain(cls);
  });

  it('leaves untagged or unknown-language blocks as plain text', () => {
    expect(highlightHtml('SELECT 1;', '')).toBeNull();
    expect(highlightHtml('x', 'nonsense')).toBeNull();
  });

  it('escapes markup so output never contains raw tags from the source', () => {
    expect(highlightHtml('<script>alert(1)</script>', 'html') ?? '').not.toContain('<script>');
  });
});
