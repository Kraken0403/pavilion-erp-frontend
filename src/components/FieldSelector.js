import React, { useState, useEffect } from 'react';
import { getLeadFields, saveSelectedFieldsOrder, getFieldOrder } from '../services/leadFieldService';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import SettingsHeading from './settings/SettingsHeading'
import '../assets/styles/FieldSelector.scss'

// Utility function to format field names
const formatFieldName = (field) => {
  return field
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
};

const FieldSelection = ({ onUpdateTable }) => {
  const [allFields, setAllFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const fields = await getLeadFields();
        // Exclude the "id" field and set all fields
        const filteredFields = (fields.fields || fields).filter((field) => field !== 'id');
        setAllFields(filteredFields);

        const savedOrder = await getFieldOrder();
        if (savedOrder.fieldOrder) {
          setSelectedFields(savedOrder.fieldOrder.filter((field) => field !== 'id')); // Exclude "id" from saved order
        }
      } catch (err) {
        console.error('Error fetching fields:', err.message);
      }
    };
    fetchFields();
  }, []);

  const handleCheckboxChange = (field) => {
    if (selectedFields.includes(field)) {
      setSelectedFields((prev) => prev.filter((item) => item !== field));
    } else {
      setSelectedFields((prev) => [...prev, field]);
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(selectedFields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSelectedFields(items);
  };

  const handleSave = async () => {
    if (selectedFields.length < 5) {
      setError('Please select at least 5 fields.');
      return;
    }
    try {
      await saveSelectedFieldsOrder(selectedFields);
      onUpdateTable(selectedFields); // Notify Leads component
      setError('');
      alert('Field order saved successfully!');
    } catch (err) {
      console.error('Error saving field order:', err.message);
    }
  };

  return (
    <div className='field-selector settings-wrapper'>
      <div className="field-wrapper">
        <div className="field-checks">
          <div className="field-section-header">
            <SettingsHeading heading="Select minimum 5 fields"/>
            <span className="selected-count">{selectedFields.length}/{allFields.length}</span>
          </div>
          {error && <p className="field-error">{error}</p>}
          <div className='check-inputs'>
            {allFields.map((field) => {
              const isSelected = selectedFields.includes(field);

              return (
                <label
                  key={field}
                  className={`field-toggle-row${isSelected ? ' is-selected' : ''}`}
                >
                  <span className="field-label">{formatFieldName(field)}</span>
                  <span className="ios-switch">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCheckboxChange(field)}
                      aria-label={`${formatFieldName(field)} visible`}
                    />
                    <span className="ios-switch-track">
                      <span className="ios-switch-thumb" />
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      
        <div className="field-order">
          <div className="field-section-header">
            <SettingsHeading heading="Reorder Selected Fields"/>
          </div>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="fields">
              {(provided) => (
                <ul {...provided.droppableProps} ref={provided.innerRef}>
                  {selectedFields.map((field, index) => (
                    <Draggable key={field} draggableId={field} index={index}>
                      {(provided) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          {formatFieldName(field)}
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
          <button className='submit-button' onClick={handleSave}>Save Changes</button>

        </div>
      </div>
    </div>
  );
};

export default FieldSelection;
