import React, { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { FormatBold, FormatItalic, FormatListBulleted, FormatListNumbered, FormatUnderlined } from '@mui/icons-material';

function WgiymEditor({ value = '', onChange, placeholder = 'Start typing…' }) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: value || '',
    editorProps: { attributes: { class: 'wgiym-editor__content', 'data-placeholder': placeholder, 'aria-label': placeholder } },
    onUpdate: ({ editor: currentEditor }) => onChange?.(currentEditor.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const nextValue = value || '';
    if (editor.getHTML() !== nextValue) editor.commands.setContent(nextValue, false);
  }, [editor, value]);

  if (!editor) return null;
  const tool = (label, active, onClick, icon) => <button type="button" aria-label={label} title={label} className={active ? 'is-active' : ''} onMouseDown={(event) => { event.preventDefault(); onClick(); }}>{icon}</button>;

  return <div className="wgiym-editor">
    <div className="wgiym-editor__toolbar">
      {tool('Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <FormatBold />)}
      {tool('Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <FormatItalic />)}
      {tool('Underline', editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), <FormatUnderlined />)}
      {tool('Bulleted list', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <FormatListBulleted />)}
      {tool('Numbered list', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <FormatListNumbered />)}
    </div>
    <EditorContent editor={editor} onClick={() => editor.chain().focus().run()} />
  </div>;
}
export default WgiymEditor;
