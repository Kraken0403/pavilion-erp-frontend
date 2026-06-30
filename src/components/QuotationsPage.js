import React, { useEffect, useState } from 'react';
import { Container, Paper } from '@mui/material';
import { createQuotation } from '../services/quotationService';
import { getContacts } from '../services/contactService';
import QuotationContactSection from '../components/quotation/QuotationContactSection';
import QuotationItemsSection from '../components/quotation/QuotationItemsSection';
import QuotationFooterSection from '../components/quotation/QuotationFooterSection';
import AddProductDialog from './products/AddProductDialog';
import AddContactDialog from '../components/contacts/AddContactDialog';
import NotificationSnackbar from '../components/ui/NotificationSnackbar';
import Topbar from './Topbar';
import QuotationList from './quotation/QuotationList';

function CreateQuotation() {
  const [contactId, setContactId] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);

  // const [quotationDate, setQuotationDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [openAddContactDialog, setOpenAddContactDialog] = useState(false);
  const [prefillContactName, setPrefillContactName] = useState('');
  const [notif, setNotif] = useState({ open: false, message: '', severity: 'success' });

  const showNotification = (message, severity = 'success') => {
    setNotif({ open: true, message, severity });
  };

  const [quotationDate, setQuotationDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // yyyy-mm-dd
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await getContacts();
      setContacts(data);
    } catch (err) {
      console.error('Failed to load contacts', err);
    }
  };

  const handleContactCreated = (newContact) => {
    setContacts(prev => [...prev, newContact]);
    setSelectedContact(newContact);
    setContactId(newContact.id);
    showNotification('✅ Contact added successfully!');
  };

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        product: null,
        quantity: 1,
        unit_price: 0,
        discount: 0,
        tax: 0,
        variant_id: null,
        category_name: '',
        packaging_type: '',
        packaging_weight: '',
        packaging_unit: '',
        length: '',
        width: '',
        height: '',
        dimensions_unit: ''
      }
    ]);
  };

  const updateItem = (index, updates) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const handleProductSelect = (index, product) => {
    if (!product) {
      updateItem(index, {
        product: null,
        unit_price: 0,
        variant_id: null,
        category_name: '',
        packaging_type: '',
        packaging_weight: '',
        packaging_unit: '',
        length: '',
        width: '',
        height: '',
        dimensions_unit: ''
      });
      return;
    }

    updateItem(index, {
      product,
      unit_price: product.cost || 0,
      variant_id: product.variantId || null,
      category_name: product.category_name || '',
      packaging_type: product.packaging_type || '',
      packaging_weight: product.packaging_weight || '',
      packaging_unit: product.packaging_unit || '',
      length: product.length || '',
      width: product.width || '',
      height: product.height || '',
      dimensions_unit: product.dimensions_unit || ''
    });
  };

  const handleSubmit = async () => {
    const errors = [];
  
    if (!contactId) errors.push('Contact');
    if (!quotationDate) errors.push('Quotation Date');
  
    const validItems = items.filter(i =>
      i.product?.id &&
      !isNaN(parseFloat(i.quantity)) &&
      !isNaN(parseFloat(i.unit_price))
    );
  
    if (validItems.length !== items.length) {
      errors.push('All products must have quantity and price');
    }
  
    if (errors.length > 0) {
      return showNotification(
        `⚠️ Please complete the following fields: ${errors.join(', ')}`,
        'warning'
      );
    }
  
    const payload = {
      contact_id: contactId,
      quotation_date: quotationDate,
      valid_until: validUntil,
      notes,
      items: validItems.map(i => ({
        product_id: i.product?.id,
        variant_id: i.variant_id || null,
        quantity: parseFloat(i.quantity),
        unit_price: parseFloat(i.unit_price),
        discount: parseFloat(i.discount) || 0,
        tax: parseFloat(i.tax) || 0
      }))
    };
  
    try {
      await createQuotation(payload);
      showNotification('✅ Quotation created!');
  
      // Reset form
      setContactId('');
      setSelectedContact(null);
      setQuotationDate('');
      setValidUntil('');
      setNotes('');
      setItems([]);
    } catch (err) {
      console.error("❌ Failed to create quotation:", err.response?.data || err.message);
      showNotification("❌ Failed to create quotation. Check console for details.", 'error');
    }
  };
  

  return (
    <div className="quotations">
        <Container>
          <Topbar />
          {/* <QuotationList /> */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <QuotationContactSection
          contactId={contactId}
          setContactId={setContactId}
          contacts={contacts}
          selectedContact={selectedContact}
          setSelectedContact={setSelectedContact}
          quotationDate={quotationDate}
          setQuotationDate={setQuotationDate}
          validUntil={validUntil}
          setValidUntil={setValidUntil}
          notes={notes}
          setNotes={setNotes}
          openAddContactDialog={() => setOpenAddContactDialog(true)}
          setPrefillContactName={setPrefillContactName}
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <QuotationItemsSection
          items={items}
          updateItem={updateItem}
          handleProductSelect={handleProductSelect}
          addItem={addItem}
          openProductDialog={openProductDialog}
          setOpenProductDialog={setOpenProductDialog}
        />
      </Paper>

      <QuotationFooterSection items={items} handleSubmit={handleSubmit} />

      <AddProductDialog
        open={openProductDialog}
        onClose={() => setOpenProductDialog(false)}
      />

      <AddContactDialog
        open={openAddContactDialog}
        onClose={() => setOpenAddContactDialog(false)}
        onContactCreated={handleContactCreated}
        prefillName={prefillContactName}
      />

      <NotificationSnackbar
        open={notif.open}
        message={notif.message}
        severity={notif.severity}
        onClose={() => setNotif({ ...notif, open: false })}
      />
    </Container>

    </div>
  
  );
}

export default CreateQuotation;
