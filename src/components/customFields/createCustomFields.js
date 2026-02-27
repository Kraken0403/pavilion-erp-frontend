import React, { useState, useEffect } from "react";
import {
  TextField,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Paper,
  Grid,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import {
  createCustomField,
  getAllCustomFields,
  updateCustomField,
  deleteCustomField,
} from "../../services/customFieldServices";
import SettingsHeading from "../settings/SettingsHeading";

const CreateCustomFields = () => {
  const [customFields, setCustomFields] = useState([]);
  const [newField, setNewField] = useState({
    field_name: "",
    field_type: "text", // Default value
    is_required: false,
    options: [],
  });
  const [editingField, setEditingField] = useState(null);
  const [currentOption, setCurrentOption] = useState("");

  const fieldTypes = ["text", "number", "email", "date", "checkbox", "select"];

  useEffect(() => {
    fetchAllFields();
  }, []);

  const fetchAllFields = async () => {
    try {
      const fields = await getAllCustomFields();
      setCustomFields(fields);
    } catch (error) {
      console.error("Error fetching custom fields:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewField({
      ...newField,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleOptionAdd = () => {
    if (!currentOption.trim()) return;
    setNewField({
      ...newField,
      options: [...newField.options, currentOption],
    });
    setCurrentOption("");
  };

  const handleOptionDelete = (index) => {
    setNewField({
      ...newField,
      options: newField.options.filter((_, i) => i !== index),
    });
  };

  const handleSaveField = async () => {
    if (!newField.field_name) {
      alert("Field label is required");
      return;
    }

    try {
      if (editingField) {
        await updateCustomField(editingField.field_id, newField);
        alert("Field updated successfully!");
      } else {
        await createCustomField(newField);
        alert("Field added successfully!");
      }
      setNewField({ field_name: "", field_type: "text", is_required: false, options: [] });
      setEditingField(null);
      setCurrentOption("");
      fetchAllFields();
    } catch (error) {
      console.error("Error saving field:", error);
      alert("Failed to save field.");
    }
  };

  const handleEditField = (field) => {
    setEditingField(field);
    setNewField({
      field_name: field.field_name,
      field_type: field.field_type,
      is_required: field.is_required,
      options: field.options || [],
    });
  };

  const handleDeleteField = async (fieldId) => {
    try {
      await deleteCustomField(fieldId);
      alert("Field deleted successfully!");
      fetchAllFields();
    } catch (error) {
      console.error("Error deleting field:", error);
      alert("Failed to delete field.");
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: "800px", mx: "auto" }}>
      <SettingsHeading heading="Create Custom Fields" />

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Field Label"
          name="field_name"
          value={newField.field_name}
          onChange={handleChange}
          sx={{ mb: 2 }}
        />
        <Select
          fullWidth
          name="field_type"
          value={newField.field_type}
          onChange={handleChange}
          sx={{ mb: 2 }}
        >
          {fieldTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </Select>
        <FormControlLabel
          control={
            <Checkbox
              name="is_required"
              checked={newField.is_required}
              onChange={handleChange}
            />
          }
          label="Required"
        />
        {(newField.field_type === "checkbox" || newField.field_type === "select") && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">Options</Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={9}>
                <TextField
                  fullWidth
                  placeholder="Add an option"
                  value={currentOption}
                  onChange={(e) => setCurrentOption(e.target.value)}
                />
              </Grid>
              <Grid item xs={3}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleOptionAdd}
                >
                  Add
                </Button>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2 }}>
              {newField.options.map((option, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography>{option}</Typography>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => handleOptionDelete(index)}
                  >
                    Delete
                  </Button>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveField}
          sx={{ mt: 3 }}
        >
          {editingField ? "Update Field" : "Add Field"}
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ mt: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Field Label</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Required</strong></TableCell>
              <TableCell><strong>Action</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customFields.map((field) => (
              <TableRow key={field.field_id}>
                <TableCell>{field.field_name}</TableCell>
                <TableCell>{field.field_type}</TableCell>
                <TableCell>{field.is_required ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEditField(field)} color="primary">
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteField(field.field_id)} color="error">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CreateCustomFields;
