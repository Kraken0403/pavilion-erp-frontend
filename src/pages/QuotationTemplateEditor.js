import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircleOutline, ChevronLeft, ContentCopyOutlined, DeleteOutline, DragIndicator,
  HorizontalRule, NotesOutlined, RestartAlt, SaveOutlined, SpaceBarOutlined,
  TextFieldsOutlined, ViewHeadlineOutlined,
} from '@mui/icons-material';
import { getQuotationSettings, saveQuotationSettings } from '../services/quotationSettingsService';
import { previewQuotationDocument } from '../services/quotationService';
import WgiymEditor from '../components/ui/WgiymEditor';
import '../assets/styles/QuotationTemplateEditor.scss';

const fontOptions = ['Segoe UI', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma'];

const baseComponents = [
  { id:'cover-letter', type:'cover_letter', enabled:true, label:'Cover Letter', page_break_after:true },
  { id:'company-header', type:'company_header', enabled:true, label:'Company Header', show_logo:true, show_company_name:true, show_address:true, show_contact:true },
  { id:'document-header', type:'document_header', enabled:true, label:'Quotation Details', heading:'Quotation', show_number:true, show_date:true, show_valid_until:true },
  { id:'client-details', type:'client_details', enabled:true, label:'Client Details', heading:'Prepared For' },
  { id:'items-table', type:'items_table', enabled:true, label:'Products Table', heading:'Quotation Items', show_heading:true },
  { id:'totals', type:'totals', enabled:true, label:'Totals', show_subtotal:true, show_discount:true, show_grand_total:true },
  { id:'notes', type:'notes', enabled:true, label:'Notes', heading:'Notes' },
  { id:'terms', type:'terms_conditions', enabled:true, label:'Terms & Conditions', heading:'Terms & Conditions', page_break_before:true },
];

const defaultBuilderConfig = {
  version:2,
  primary_color:'#2c3e50',
  accent_color:'#e67e22',
  text_color:'#253a43',
  muted_color:'#6b7b8d',
  font_family:'Segoe UI',
  font_size:12,
  section_spacing:16,
  page_margin_top:12,
  page_margin_right:12,
  page_margin_bottom:12,
  page_margin_left:12,
  custom_header_html:'',
  custom_footer_html:'',
  header_height_mm:12,
  footer_height_mm:10,
  page_number_enabled:false,
  page_number_position:'right',
  hide_empty_columns:true,
  components:baseComponents,
};

const blockLibrary = [
  { type:'company_header', label:'Company Header', description:'Logo and issuer company information.', icon:<ViewHeadlineOutlined /> },
  { type:'document_header', label:'Quotation Details', description:'Quotation title, number and dates.', icon:<TextFieldsOutlined /> },
  { type:'client_details', label:'Client Details', description:'Customer/contact information.', icon:<ViewHeadlineOutlined /> },
  { type:'items_table', label:'Products Table', description:'Dynamic quotation order lines.', icon:<ViewHeadlineOutlined /> },
  { type:'totals', label:'Totals', description:'Subtotal, discount and grand total.', icon:<ViewHeadlineOutlined /> },
  { type:'cover_letter', label:'Cover Letter', description:'Per-quotation cover letter content.', icon:<NotesOutlined /> },
  { type:'notes', label:'Notes', description:'Quotation notes and reusable footer notes.', icon:<NotesOutlined /> },
  { type:'terms_conditions', label:'Terms & Conditions', description:'Payment terms and T&C.', icon:<NotesOutlined /> },
  { type:'custom_content', label:'Rich Text', description:'Reusable custom content block.', icon:<TextFieldsOutlined /> },
  { type:'divider', label:'Divider', description:'Horizontal visual separator.', icon:<HorizontalRule /> },
  { type:'spacer', label:'Spacer', description:'Adjustable vertical spacing.', icon:<SpaceBarOutlined /> },
];

const singletonTypes = new Set(['company_header','document_header','client_details','items_table','totals','cover_letter','notes','terms_conditions']);

const parseConfig = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_) { return {}; }
};

const cloneComponents = (components = baseComponents) => components.map((component) => ({ ...component }));
const clamp = (value, min, max, fallback = min) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};
const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const normalizeLegacyConfig = (data) => {
  const parsed = parseConfig(data?.template_config_json);
  if (parsed?.builder && typeof parsed.builder === 'object') {
    return {
      ...defaultBuilderConfig,
      ...parsed.builder,
      components:Array.isArray(parsed.builder.components) && parsed.builder.components.length
        ? cloneComponents(parsed.builder.components)
        : cloneComponents(),
    };
  }

  const legacy = parsed?.[data?.layout_option] || parsed?.minimal || parsed?.classic || parsed?.modern || {};
  const pagePadding = clamp(legacy.page_padding, 0, 40, 12);
  const components = cloneComponents();
  const byType = (type) => components.find((component) => component.type === type);
  byType('company_header').enabled = legacy.show_company_header !== false;
  byType('client_details').enabled = legacy.show_client_section !== false;
  byType('cover_letter').enabled = legacy.show_cover !== false;
  byType('terms_conditions').enabled = legacy.show_terms !== false;

  const insertBefore = (type, html, id) => {
    if (!stripHtml(html)) return;
    const index = components.findIndex((component) => component.type === type);
    components.splice(Math.max(0,index),0,{ id, type:'custom_content', label:'Custom Content', enabled:true, html });
  };
  const insertAfter = (type, html, id) => {
    if (!stripHtml(html)) return;
    const index = components.findIndex((component) => component.type === type);
    components.splice(index >= 0 ? index + 1 : components.length,0,{ id, type:'custom_content', label:'Custom Content', enabled:true, html });
  };
  insertBefore('document_header', legacy.static_header_html, 'legacy-top');
  insertBefore('items_table', legacy.static_before_items_html, 'legacy-before-items');
  insertAfter('totals', legacy.static_after_items_html, 'legacy-after-items');
  insertAfter('notes', legacy.static_footer_html, 'legacy-bottom');

  return {
    ...defaultBuilderConfig,
    primary_color:legacy.primary_color || defaultBuilderConfig.primary_color,
    accent_color:legacy.accent_color || defaultBuilderConfig.accent_color,
    font_family:legacy.font_family || defaultBuilderConfig.font_family,
    font_size:clamp(legacy.font_size,9,18,12),
    section_spacing:clamp(legacy.section_spacing,0,48,16),
    page_margin_top:pagePadding,
    page_margin_right:pagePadding,
    page_margin_bottom:pagePadding,
    page_margin_left:pagePadding,
    components,
  };
};

const makeBlock = (type, sequence) => {
  const base = baseComponents.find((component) => component.type === type);
  if (base) return { ...base, id:`${type}-${Date.now()}-${sequence}` };
  if (type === 'custom_content') return { id:`custom-${Date.now()}-${sequence}`, type, label:'Rich Text', enabled:true, html:'<p>Custom content</p>' };
  if (type === 'divider') return { id:`divider-${Date.now()}-${sequence}`, type, label:'Divider', enabled:true };
  if (type === 'spacer') return { id:`spacer-${Date.now()}-${sequence}`, type, label:'Spacer', enabled:true, height:24 };
  return { id:`block-${Date.now()}-${sequence}`, type, label:'Block', enabled:true };
};

function ToggleRow({ title, description, checked, onChange }) {
  return <label className="template-toggle-row">
    <span><strong>{title}</strong>{description && <small>{description}</small>}</span>
    <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
  </label>;
}

function NumberField({ label, value, min, max, unit, onChange }) {
  return <label className="template-number-field"><span>{label}</span><div><input type="number" min={min} max={max} value={value} onChange={(event) => onChange(clamp(event.target.value,min,max,value))} />{unit && <em>{unit}</em>}</div></label>;
}

export default function QuotationTemplateEditor() {
  const [settings, setSettings] = useState(null);
  const [config, setConfig] = useState(defaultBuilderConfig);
  const [selectedId, setSelectedId] = useState('document-header');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const blockSequence = useRef(1);

  useEffect(() => {
    let active = true;
    getQuotationSettings()
      .then((data) => {
        if (!active) return;
        const normalized = normalizeLegacyConfig(data || {});
        setSettings(data || {});
        setConfig(normalized);
        setSelectedId(normalized.components.find((component) => component.type === 'document_header')?.id || normalized.components[0]?.id || '');
      })
      .catch((error) => {
        console.error('Failed to load quotation template settings:', error);
        if (active) setNotice({ type:'error', text:'Failed to load quotation template builder.' });
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const selectedComponent = useMemo(
    () => config.components.find((component) => component.id === selectedId) || null,
    [config.components, selectedId]
  );

  useEffect(() => {
    if (!settings) return undefined;
    let active = true;
    const today = new Date();
    const validUntil = new Date(today);
    validUntil.setDate(validUntil.getDate() + 30);
    const toIso = (date) => date.toISOString().slice(0,10);
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const html = await previewQuotationDocument({
          form:{
            template:'builder', quotation_template:'builder', quotation_number:'QT/2026/001', quotation_date:toIso(today), valid_until:toIso(validUntil),
            customer_company:'Sample Client Company', customer_email:'client@example.com', customer_phone:'+91 98765 43210',
            issuer_company_name:'Your Company', issuer_company_email:'hello@yourcompany.com', issuer_company_phone:'+91 12345 67890',
            issuer_company_address:'Ahmedabad, Gujarat', company_logo_url:settings.logo_url || '',
            cover_letter_html:settings.cover_letter_html || '<p>Thank you for the opportunity to prepare this quotation.</p>',
            terms_conditions_html:settings.terms_conditions_html || '<p>This quotation is valid until the expiration date shown above.</p>',
            payment_terms:settings.default_payment_terms || '<p>Payment due as agreed.</p>',
            notes:'<p>Sample quotation note.</p>',
          },
          lead:{ first_name:'Client', last_name:'Name', company_name:'Sample Client Company', email:'client@example.com', phone_number:'+91 98765 43210' },
          items:[
            { product_id:1, product_name:'Premium AV Receiver', description:'High-performance receiver for home theatre.', brand:'Brand One', quantity:1, unit_price:65000, discount:2500, gst_rate:18 },
            { product_id:2, product_name:'In-wall Speaker', description:'Architectural speaker.', brand:'', quantity:2, unit_price:25000, discount:0, gst_rate:18 },
          ],
          totals:{ subtotal:115000, itemDiscount:2500, overallDiscount:0, tax:20250, total:132750 },
          quotationColumns:['image','brand','product','description','sku','quantity','unit_price','selling_price_unit','discount','gst_rate','hsn_sac','total'],
          template_config:config,
        });
        if (active) {
          setPreviewHtml(html);
          setPreviewError('');
        }
      } catch (_) {
        if (active) setPreviewError('Unable to render the quotation template preview.');
      } finally {
        if (active) setPreviewLoading(false);
      }
    },350);
    return () => { active = false; window.clearTimeout(timer); };
  }, [settings, config]);

  const updateConfig = (key, value) => {
    setConfig((current) => ({ ...current, [key]:value }));
    setNotice(null);
  };

  const updateSelected = (patch) => {
    if (!selectedId) return;
    setConfig((current) => ({
      ...current,
      components:current.components.map((component) => component.id === selectedId ? { ...component, ...patch } : component),
    }));
    setNotice(null);
  };

  const addBlock = (type, index = config.components.length) => {
    if (singletonTypes.has(type)) {
      const existing = config.components.find((component) => component.type === type);
      if (existing) {
        setSelectedId(existing.id);
        setNotice({ type:'info', text:`${existing.label || 'That block'} is already on the page. Drag it to reposition it.` });
        return;
      }
    }
    const block = makeBlock(type,blockSequence.current++);
    setConfig((current) => {
      const next = [...current.components];
      next.splice(Math.max(0,Math.min(index,next.length)),0,block);
      return { ...current, components:next };
    });
    setSelectedId(block.id);
    setNotice(null);
  };

  const removeBlock = (id) => {
    setConfig((current) => ({ ...current, components:current.components.filter((component) => component.id !== id) }));
    if (selectedId === id) setSelectedId('');
    setNotice(null);
  };

  const duplicateBlock = (component) => {
    if (!component || singletonTypes.has(component.type)) return;
    const copy = { ...component, id:`${component.type}-${Date.now()}-${blockSequence.current++}`, label:component.label || 'Block' };
    setConfig((current) => {
      const index = current.components.findIndex((item) => item.id === component.id);
      const next = [...current.components];
      next.splice(index + 1,0,copy);
      return { ...current, components:next };
    });
    setSelectedId(copy.id);
  };

  const parseDragPayload = (event) => {
    try { return JSON.parse(event.dataTransfer.getData('application/x-quotation-builder')); } catch (_) { return null; }
  };

  const dropAt = (event, targetIndex) => {
    event.preventDefault();
    const payload = parseDragPayload(event);
    if (!payload) return;
    if (payload.source === 'palette') return addBlock(payload.type,targetIndex);
    if (payload.source === 'canvas') {
      setConfig((current) => {
        const fromIndex = current.components.findIndex((component) => component.id === payload.id);
        if (fromIndex < 0) return current;
        const next = [...current.components];
        const [moved] = next.splice(fromIndex,1);
        const adjustedIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
        next.splice(Math.max(0,Math.min(adjustedIndex,next.length)),0,moved);
        return { ...current, components:next };
      });
      setSelectedId(payload.id);
    }
  };

  const resetBuilder = () => {
    const next = { ...defaultBuilderConfig, components:cloneComponents() };
    setConfig(next);
    setSelectedId('document-header');
    setNotice({ type:'info', text:'Builder reset locally. Save to apply the reset.' });
  };

  const handleSave = async () => {
    if (!settings || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const nextSettings = {
        ...settings,
        layout_option:'builder',
        template_config_json:{ version:2, builder:config },
      };
      await saveQuotationSettings(nextSettings);
      setSettings(nextSettings);
      setNotice({ type:'success', text:'Quotation template saved. Preview, public link and PDF now use this builder.' });
    } catch (error) {
      console.error('Failed to save quotation template:', error);
      setNotice({ type:'error', text:'Failed to save quotation template.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="quotation-template-editor"><div className="template-loading">Loading quotation builder…</div></div>;

  return <div className="quotation-template-editor">
    <div className="template-editor-topbar">
      <div>
        <a href="/quotations" className="template-back-link"><ChevronLeft />Back to quotations</a>
        <h1>Quotation template builder</h1>
        <p>One template source for live preview, public quotation view and generated PDF.</p>
      </div>
      <div className="template-topbar-actions">
        <button type="button" className="template-reset-button" onClick={resetBuilder}><RestartAlt />Reset</button>
        <button type="button" className="template-save-button" disabled={saving} onClick={handleSave}><SaveOutlined />{saving ? 'Saving…' : 'Save template'}</button>
      </div>
    </div>

    {notice && <div className={`template-notice is-${notice.type}`}>{notice.type === 'success' && <CheckCircleOutline />}{notice.text}</div>}

    <div className="template-editor-layout">
      <aside className="template-builder-sidebar">
        <section className="template-panel-card">
          <div className="template-card-heading"><div><h2>Blocks</h2><p>Drag blocks onto the page structure.</p></div></div>
          <div className="template-block-library">
            {blockLibrary.map((block) => <button
              key={block.type}
              type="button"
              draggable
              className="template-library-block"
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'copy';
                event.dataTransfer.setData('application/x-quotation-builder',JSON.stringify({ source:'palette', type:block.type }));
              }}
              onClick={() => addBlock(block.type)}
            >
              <span>{block.icon}</span><div><strong>{block.label}</strong><small>{block.description}</small></div>
            </button>)}
          </div>
        </section>

        <section className="template-panel-card">
          <div className="template-card-heading"><div><h2>Document</h2><p>Global A4 appearance.</p></div></div>
          <div className="template-form-stack">
            <label><span>Font family</span><select value={config.font_family} onChange={(event) => updateConfig('font_family',event.target.value)}>{fontOptions.map((font) => <option key={font}>{font}</option>)}</select></label>
            <NumberField label="Base font size" value={config.font_size} min={9} max={18} unit="px" onChange={(value) => updateConfig('font_size',value)} />
            <NumberField label="Block spacing" value={config.section_spacing} min={0} max={48} unit="px" onChange={(value) => updateConfig('section_spacing',value)} />
            <div className="template-color-grid">
              <label><span>Primary</span><input type="color" value={config.primary_color} onChange={(event) => updateConfig('primary_color',event.target.value)} /></label>
              <label><span>Accent</span><input type="color" value={config.accent_color} onChange={(event) => updateConfig('accent_color',event.target.value)} /></label>
              <label><span>Text</span><input type="color" value={config.text_color} onChange={(event) => updateConfig('text_color',event.target.value)} /></label>
              <label><span>Muted</span><input type="color" value={config.muted_color} onChange={(event) => updateConfig('muted_color',event.target.value)} /></label>
            </div>
          </div>
        </section>
      </aside>

      <main className="template-builder-canvas-column">
        <section className="template-panel-card template-page-settings">
          <div className="template-card-heading"><div><h2>Page setup</h2><p>These margins are used by the generated PDF, not just the preview.</p></div></div>
          <div className="template-margin-grid">
            <NumberField label="Top" value={config.page_margin_top} min={0} max={40} unit="mm" onChange={(value) => updateConfig('page_margin_top',value)} />
            <NumberField label="Right" value={config.page_margin_right} min={0} max={40} unit="mm" onChange={(value) => updateConfig('page_margin_right',value)} />
            <NumberField label="Bottom" value={config.page_margin_bottom} min={0} max={40} unit="mm" onChange={(value) => updateConfig('page_margin_bottom',value)} />
            <NumberField label="Left" value={config.page_margin_left} min={0} max={40} unit="mm" onChange={(value) => updateConfig('page_margin_left',value)} />
          </div>
          <div className="template-toggle-list compact">
            <ToggleRow title="Hide empty quotation columns" description="A selected column is omitted when every line has no value for it." checked={config.hide_empty_columns !== false} onChange={(value) => updateConfig('hide_empty_columns',value)} />
            <ToggleRow title="Page numbers" description="Adds Page X of Y to generated PDFs." checked={config.page_number_enabled} onChange={(value) => updateConfig('page_number_enabled',value)} />
          </div>
          {config.page_number_enabled && <label className="template-inline-select"><span>Page number position</span><select value={config.page_number_position} onChange={(event) => updateConfig('page_number_position',event.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>}
        </section>

        <section className="template-panel-card template-running-content">
          <div className="template-card-heading"><div><h2>PDF header & footer</h2><p>Optional repeating content. These replace the old hard-coded quotation header/footer.</p></div></div>
          <div className="template-editor-field"><label>Custom repeating header</label><WgiymEditor value={config.custom_header_html} onChange={(value) => updateConfig('custom_header_html',value)} placeholder="Optional custom PDF header…" /></div>
          {stripHtml(config.custom_header_html) && <NumberField label="Header area height" value={config.header_height_mm} min={6} max={35} unit="mm" onChange={(value) => updateConfig('header_height_mm',value)} />}
          <div className="template-editor-field"><label>Custom repeating footer</label><WgiymEditor value={config.custom_footer_html} onChange={(value) => updateConfig('custom_footer_html',value)} placeholder="Optional custom PDF footer…" /></div>
          {(stripHtml(config.custom_footer_html) || config.page_number_enabled) && <NumberField label="Footer area height" value={config.footer_height_mm} min={6} max={35} unit="mm" onChange={(value) => updateConfig('footer_height_mm',value)} />}
        </section>

        <section className="template-panel-card template-structure-card">
          <div className="template-card-heading"><div><h2>Page structure</h2><p>Drag to reorder. Click a block to edit it.</p></div><span>{config.components.length} blocks</span></div>
          <div className="template-drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropAt(event,0)}>Drop block here</div>
          {config.components.map((component,index) => <React.Fragment key={component.id}>
            <div
              className={`template-canvas-block ${selectedId === component.id ? 'is-selected' : ''} ${component.enabled === false ? 'is-disabled' : ''}`}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('application/x-quotation-builder',JSON.stringify({ source:'canvas', id:component.id }));
              }}
              onClick={() => setSelectedId(component.id)}
            >
              <DragIndicator className="template-canvas-drag" />
              <div><strong>{component.label || blockLibrary.find((block) => block.type === component.type)?.label || component.type}</strong><small>{component.type.replace(/_/g,' ')}</small></div>
              <span className={`template-block-status ${component.enabled === false ? 'is-off' : ''}`}>{component.enabled === false ? 'Hidden' : 'Visible'}</span>
              {!singletonTypes.has(component.type) && <button type="button" title="Duplicate" onClick={(event) => { event.stopPropagation(); duplicateBlock(component); }}><ContentCopyOutlined /></button>}
              <button type="button" title="Remove" onClick={(event) => { event.stopPropagation(); removeBlock(component.id); }}><DeleteOutline /></button>
            </div>
            <div className="template-drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropAt(event,index + 1)}>Drop block here</div>
          </React.Fragment>)}
        </section>

        {selectedComponent && <section className="template-panel-card template-inspector-card">
          <div className="template-card-heading"><div><h2>Edit block</h2><p>{selectedComponent.label || selectedComponent.type}</p></div></div>
          <div className="template-toggle-list compact"><ToggleRow title="Show this block" checked={selectedComponent.enabled !== false} onChange={(value) => updateSelected({ enabled:value })} /></div>
          {['document_header','client_details','items_table','notes','terms_conditions'].includes(selectedComponent.type) && <label className="template-text-field"><span>Heading</span><input value={selectedComponent.heading || ''} onChange={(event) => updateSelected({ heading:event.target.value })} /></label>}
          {selectedComponent.type === 'company_header' && <div className="template-toggle-list compact">
            <ToggleRow title="Show logo" checked={selectedComponent.show_logo !== false} onChange={(value) => updateSelected({ show_logo:value })} />
            <ToggleRow title="Show company name" checked={selectedComponent.show_company_name !== false} onChange={(value) => updateSelected({ show_company_name:value })} />
            <ToggleRow title="Show address" checked={selectedComponent.show_address !== false} onChange={(value) => updateSelected({ show_address:value })} />
            <ToggleRow title="Show phone / email" checked={selectedComponent.show_contact !== false} onChange={(value) => updateSelected({ show_contact:value })} />
          </div>}
          {selectedComponent.type === 'document_header' && <div className="template-toggle-list compact">
            <ToggleRow title="Quotation number" checked={selectedComponent.show_number !== false} onChange={(value) => updateSelected({ show_number:value })} />
            <ToggleRow title="Quotation date" checked={selectedComponent.show_date !== false} onChange={(value) => updateSelected({ show_date:value })} />
            <ToggleRow title="Expiration date" checked={selectedComponent.show_valid_until !== false} onChange={(value) => updateSelected({ show_valid_until:value })} />
          </div>}
          {selectedComponent.type === 'items_table' && <div className="template-toggle-list compact"><ToggleRow title="Show section heading" checked={selectedComponent.show_heading !== false} onChange={(value) => updateSelected({ show_heading:value })} /></div>}
          {selectedComponent.type === 'totals' && <div className="template-toggle-list compact">
            <ToggleRow title="Subtotal" checked={selectedComponent.show_subtotal !== false} onChange={(value) => updateSelected({ show_subtotal:value })} />
            <ToggleRow title="Discount" checked={selectedComponent.show_discount !== false} onChange={(value) => updateSelected({ show_discount:value })} />
            <ToggleRow title="Grand total" checked={selectedComponent.show_grand_total !== false} onChange={(value) => updateSelected({ show_grand_total:value })} />
          </div>}
          {selectedComponent.type === 'custom_content' && <div className="template-editor-field"><label>Content</label><WgiymEditor value={selectedComponent.html || ''} onChange={(value) => updateSelected({ html:value })} /></div>}
          {selectedComponent.type === 'spacer' && <NumberField label="Spacer height" value={selectedComponent.height || 24} min={4} max={120} unit="px" onChange={(value) => updateSelected({ height:value })} />}
          <div className="template-break-grid">
            <ToggleRow title="Page break before" checked={Boolean(selectedComponent.page_break_before)} onChange={(value) => updateSelected({ page_break_before:value })} />
            <ToggleRow title="Page break after" checked={Boolean(selectedComponent.page_break_after)} onChange={(value) => updateSelected({ page_break_after:value })} />
          </div>
          <div className="template-block-appearance">
            <NumberField label="Inner padding" value={selectedComponent.padding || 0} min={0} max={48} unit="px" onChange={(value) => updateSelected({ padding:value })} />
            <NumberField label="Border width" value={selectedComponent.border_width || 0} min={0} max={6} unit="px" onChange={(value) => updateSelected({ border_width:value })} />
            <label><span>Background</span><input type="color" value={selectedComponent.background_color || '#ffffff'} onChange={(event) => updateSelected({ background_color:event.target.value })} /></label>
            <label><span>Border</span><input type="color" value={selectedComponent.border_color || '#dfe3eb'} onChange={(event) => updateSelected({ border_color:event.target.value })} /></label>
            <label><span>Alignment</span><select value={selectedComponent.text_align || 'left'} onChange={(event) => updateSelected({ text_align:event.target.value })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
            <NumberField label="Text size" value={selectedComponent.font_size || 0} min={0} max={28} unit="px" onChange={(value) => updateSelected({ font_size:value })} />
            <NumberField label="Corner radius" value={selectedComponent.border_radius || 0} min={0} max={32} unit="px" onChange={(value) => updateSelected({ border_radius:value })} />
            <NumberField label="Content width" value={selectedComponent.max_width || 0} min={0} max={100} unit="%" onChange={(value) => updateSelected({ max_width:value })} />
            <label><span>Text colour</span><input type="color" value={selectedComponent.text_color || config.text_color} onChange={(event) => updateSelected({ text_color:event.target.value })} /></label>
          </div>
        </section>}
      </main>

      <aside className="template-live-preview">
        <div className="template-preview-toolbar"><strong>Live A4 preview</strong><span>{previewLoading ? 'Updating…' : 'Builder source'}</span></div>
        <div className="template-preview-document">
          {previewError && !previewHtml && <div className="template-preview-error">{previewError}</div>}
          {previewHtml && <iframe title="Quotation template builder preview" srcDoc={previewHtml} sandbox="allow-same-origin allow-scripts" />}
        </div>
      </aside>
    </div>
  </div>;
}
