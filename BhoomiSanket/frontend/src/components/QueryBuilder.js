import React, { useState, useEffect, useCallback } from 'react';
import './QueryBuilder.css';

const API_URL = process.env.REACT_APP_API_BASE_URL + "/query-builder";

// Type icons matching QGIS style
const TYPE_ICONS = {
    string: "abc",
    numeric: "1.2"
};

const COMPARISON_OPERATORS = ["=", "<", ">", "<=", ">=", "!="];
const TEXT_OPERATORS = ["LIKE", "ILIKE"];
const SET_OPERATORS = ["IN", "NOT IN"];
const LOGIC_OPERATORS = ["AND", "OR", "NOT"];

const QueryBuilder = ({ isOpen, onClose, onApplyFilter, onClearFilter }) => {
    // State
    const [columns, setColumns] = useState([]);
    const [selectedField, setSelectedField] = useState(null);
    const [selectedOperator, setSelectedOperator] = useState(null);
    const [values, setValues] = useState([]);
    const [valuesLoading, setValuesLoading] = useState(false);
    const [valueSearch, setValueSearch] = useState('');
    const [selectedValue, setSelectedValue] = useState(null);
    const [numericInfo, setNumericInfo] = useState(null); // {min, max}
    const [expression, setExpression] = useState('');
    const [filters, setFilters] = useState([]); // Built filter conditions
    const [matchInfo, setMatchInfo] = useState(null); // {total_matches, matching_subdistricts}
    const [matchError, setMatchError] = useState(null);
    const [currentLogic, setCurrentLogic] = useState("AND");

    // Fetch columns on mount
    useEffect(() => {
        fetch(`${API_URL}/columns`)
            .then(res => res.json())
            .then(data => setColumns(data.columns || []))
            .catch(err => console.error("Error fetching columns:", err));
    }, []);

    // Fetch values when field is selected
    useEffect(() => {
        if (!selectedField) {
            setValues([]);
            setNumericInfo(null);
            return;
        }

        setValuesLoading(true);
        setValues([]);
        setNumericInfo(null);
        setValueSearch('');
        setSelectedValue(null);

        fetch(`${API_URL}/values?column=${encodeURIComponent(selectedField.name)}`)
            .then(res => res.json())
            .then(data => {
                setValues(data.values || []);
                if (data.type === 'numeric') {
                    setNumericInfo({ min: data.min, max: data.max });
                }
            })
            .catch(err => console.error("Error fetching values:", err))
            .finally(() => setValuesLoading(false));
    }, [selectedField]);

    // Build expression string from filters
    // Build expression string from filters
    const buildExpression = useCallback((filterList, logic, pendingField, pendingOp, pendingVal) => {
        let base = filterList.map(f => {
            const val = typeof f.value === 'string' ? `'${f.value}'` : f.value;
            return `"${f.field}" ${f.operator} ${val}`;
        }).join(` ${logic} `);

        // Append pending selection if exists
        if (pendingField) {
            if (base) base += ` ${logic} `;
            base += `"${pendingField.label || pendingField.name}"`;

            if (pendingOp) {
                base += ` ${pendingOp}`;
                if (pendingVal !== null) {
                    const label = typeof pendingVal === 'object' ? pendingVal.label : String(pendingVal);
                    const formatted = pendingField.type === 'numeric' ? label : `'${label}'`;
                    base += ` ${formatted}`;
                }
            }
        }
        return base;
    }, []);

    // Update expression when filters change or user makes pending selections
    useEffect(() => {
        setExpression(buildExpression(filters, currentLogic, selectedField, selectedOperator, selectedValue));
    }, [filters, currentLogic, selectedField, selectedOperator, selectedValue, buildExpression]);

    // Filtered values for search
    const filteredValues = values.filter(v => {
        if (!valueSearch) return true;
        return String(v).toLowerCase().includes(valueSearch.toLowerCase());
    });

    // --- Handlers ---
    const handleFieldSelect = (col) => {
        setSelectedField(col);
        setSelectedOperator(null);
        setSelectedValue(null);
    };

    const handleOperatorClick = (op) => {
        if (LOGIC_OPERATORS.includes(op)) {
            setCurrentLogic(op === "NOT" ? "AND" : op);
            return;
        }
        setSelectedOperator(op);
    };

    const handleValueSelect = (val) => {
        setSelectedValue(val);
        // Stepwise Flow: Automatically add the condition when a value is selected
        setTimeout(() => handleAddCondition(val), 100);
    };

    const handleAddCondition = (directValue = null) => {
        const valToUse = directValue !== null ? directValue : selectedValue;
        if (!selectedField || valToUse === null) return;

        // If numeric type and no operator, default to "="
        const opToUse = selectedOperator || (selectedField.type === 'numeric' ? "=" : "LIKE");

        let newFilters = [];

        // Handle Range Selection (Numeric Bins)
        if (selectedField.type === 'numeric' && typeof valToUse === 'object' && valToUse.label) {
            if (opToUse === "=" || opToUse === "IN") {
                newFilters = [
                    { field: selectedField.name, operator: ">=", value: Number(valToUse.min) },
                    { field: selectedField.name, operator: "<=", value: Number(valToUse.max) }
                ];
            } else if (opToUse === ">" || opToUse === ">=") {
                newFilters = [{ field: selectedField.name, operator: opToUse, value: Number(valToUse.min) }];
            } else if (opToUse === "<" || opToUse === "<=") {
                newFilters = [{ field: selectedField.name, operator: opToUse, value: Number(valToUse.max) }];
            } else {
                newFilters = [
                    { field: selectedField.name, operator: ">=", value: Number(valToUse.min) },
                    { field: selectedField.name, operator: "<=", value: Number(valToUse.max) }
                ];
            }
        } else {
            // Standard single value condition
            newFilters = [{
                field: selectedField.name,
                operator: opToUse,
                value: selectedField.type === 'numeric' ? Number(valToUse) : String(valToUse)
            }];
        }

        setFilters([...filters, ...newFilters]);

        // Reset for next condition
        setSelectedField(null);
        setSelectedOperator(null);
        setSelectedValue(null);
        setMatchInfo(null);
        setMatchError(null);
    };

    const handleValueDoubleClick = (val) => {
        // Double click = auto-add condition
        setSelectedValue(val);
        // We use setTimeout to ensure setSelectedValue has "taken" if we were to use state, 
        // but since we are about to use 'val' directly, we can just call handleAddCondition logic.

        let newFilters = [];
        if (selectedField.type === 'numeric' && typeof val === 'object' && val.label) {
            newFilters = [
                { field: selectedField.name, operator: ">=", value: Number(val.min) },
                { field: selectedField.name, operator: "<=", value: Number(val.max) }
            ];
        } else {
            newFilters = [{
                field: selectedField.name,
                operator: selectedOperator || "=",
                value: selectedField.type === 'numeric' ? Number(val) : String(val)
            }];
        }

        setFilters([...filters, ...newFilters]);
        setMatchInfo(null);
        setMatchError(null);
        setSelectedOperator(null);
        setSelectedValue(null);
    };

    const handleTest = async () => {
        if (filters.length === 0) {
            setMatchError("No conditions to test. Add at least one filter condition.");
            return;
        }

        try {
            setMatchError(null);
            const res = await fetch(`${API_URL}/filter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filters, logic: currentLogic })
            });

            if (!res.ok) {
                const err = await res.json();
                setMatchError(err.detail || 'Filter error');
                return;
            }

            const data = await res.json();
            setMatchInfo(data);
        } catch (err) {
            setMatchError(err.message);
        }
    };

    const handleOk = async () => {
        if (filters.length === 0) return;

        try {
            const res = await fetch(`${API_URL}/filter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filters, logic: currentLogic })
            });

            if (!res.ok) {
                const err = await res.json();
                setMatchError(err.detail || 'Filter error');
                return;
            }

            const data = await res.json();
            onApplyFilter(data.matching_subdistricts);
            onClose();
        } catch (err) {
            setMatchError(err.message);
        }
    };

    const handleClear = () => {
        setFilters([]);
        setExpression('');
        setSelectedField(null);
        setSelectedOperator(null);
        setSelectedValue(null);
        setMatchInfo(null);
        setMatchError(null);
        onClearFilter();
    };

    const handleRemoveLastFilter = () => {
        const newFilters = filters.slice(0, -1);
        setFilters(newFilters);
        setMatchInfo(null);
    };

    if (!isOpen) return null;

    return (
        <div className="qb-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="qb-dialog">
                {/* Title Bar */}
                <div className="qb-titlebar">
                    <span>🔍 Query Builder — Filter Map Data</span>
                    <button className="qb-titlebar-close" onClick={onClose}>✕</button>
                </div>

                {/* Body */}
                <div className="qb-body">
                    {/* Top Row: Fields + Values */}
                    <div className="qb-top-row">
                        {/* Fields Panel */}
                        <div className="qb-fields-panel">
                            <div className="qb-panel-header">Fields</div>
                            <div className="qb-fields-list">
                                {columns.map(col => (
                                    <button
                                        key={col.name}
                                        className={`qb-field-item ${selectedField?.name === col.name ? 'selected' : ''}`}
                                        onClick={() => handleFieldSelect(col)}
                                    >
                                        <span className={`qb-field-type ${col.type}`}>
                                            {TYPE_ICONS[col.type] || col.type}
                                        </span>
                                        <span>{col.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Values Panel */}
                        <div className="qb-values-panel">
                            <div className="qb-panel-header">Values</div>
                            <input
                                className="qb-values-search"
                                placeholder="Search..."
                                value={valueSearch}
                                onChange={(e) => setValueSearch(e.target.value)}
                                disabled={!selectedField}
                            />
                            {valuesLoading ? (
                                <div className="qb-values-info">Loading values...</div>
                            ) : !selectedField ? (
                                <div className="qb-values-info">Select a field to see values</div>
                            ) : (
                                <>
                                    {numericInfo && (
                                        <div className="qb-values-info">
                                            Range: {numericInfo.min} — {numericInfo.max}
                                        </div>
                                    )}
                                    <div className="qb-values-list">
                                        {filteredValues.length > 0 ? (
                                            filteredValues.map((val, idx) => {
                                                const label = typeof val === 'object' ? val.label : String(val);
                                                const isSelected = typeof val === 'object' ? selectedValue?.label === val.label : selectedValue === val;

                                                return (
                                                    <button
                                                        key={idx}
                                                        className={`qb-value-item ${isSelected ? 'selected' : ''}`}
                                                        onClick={() => handleValueSelect(val)}
                                                        onDoubleClick={() => handleValueDoubleClick(val)}
                                                    >
                                                        {label}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="qb-values-info">No values found</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Operators */}
                    <div className="qb-operators-section">
                        <div className="qb-operators-header">Operators</div>
                        <div className="qb-operators-grid">
                            {COMPARISON_OPERATORS.map(op => (
                                <button
                                    key={op}
                                    className={`qb-op-btn ${selectedOperator === op ? 'active' : ''}`}
                                    onClick={() => handleOperatorClick(op)}
                                >{op}</button>
                            ))}
                            {TEXT_OPERATORS.map(op => (
                                <button
                                    key={op}
                                    className={`qb-op-btn ${selectedOperator === op ? 'active' : ''}`}
                                    onClick={() => handleOperatorClick(op)}
                                >{op}</button>
                            ))}
                            {SET_OPERATORS.map(op => (
                                <button
                                    key={op}
                                    className={`qb-op-btn ${selectedOperator === op ? 'active' : ''}`}
                                    onClick={() => handleOperatorClick(op)}
                                >{op}</button>
                            ))}
                            <span style={{ width: '100%', height: 0 }} />
                            {LOGIC_OPERATORS.map(op => (
                                <button
                                    key={op}
                                    className={`qb-op-btn ${currentLogic === op ? 'active' : ''}`}
                                    onClick={() => handleOperatorClick(op)}
                                >{op}</button>
                            ))}
                            {/* Add Condition button */}
                            <button
                                className="qb-op-btn"
                                style={{
                                    marginLeft: 'auto',
                                    background: (selectedField && selectedValue !== null) ? '#e8f5e9' : '#f5f5f5',
                                    fontFamily: 'inherit',
                                    fontWeight: 600,
                                    color: (selectedField && selectedValue !== null) ? '#2e7d32' : '#aaa',
                                }}
                                onClick={handleAddCondition}
                                disabled={!selectedField || selectedValue === null}
                            >
                                + Add Condition
                            </button>
                        </div>
                    </div>

                    {/* Expression Preview */}
                    <div className="qb-expression-section">
                        <div className="qb-expression-label">
                            Filter Expression
                            {filters.length > 0 && (
                                <button
                                    onClick={handleRemoveLastFilter}
                                    style={{
                                        float: 'right', background: 'none', border: 'none',
                                        color: '#c62828', cursor: 'pointer', fontSize: '11px'
                                    }}
                                >
                                    ← Undo Last
                                </button>
                            )}
                        </div>
                        <textarea
                            className="qb-expression-area"
                            value={expression}
                            readOnly
                            placeholder='Build your filter expression using the panels above...'
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="qb-footer">
                    <div className="qb-footer-left">
                        <button className="qb-btn qb-btn-primary" onClick={handleOk} disabled={filters.length === 0}>
                            OK
                        </button>
                        <button className="qb-btn" onClick={handleTest} disabled={filters.length === 0}>
                            Test
                        </button>
                        <button className="qb-btn qb-btn-danger" onClick={handleClear}>
                            Clear
                        </button>
                    </div>
                    <div className="qb-footer-right">
                        {matchInfo && (
                            <span className="qb-match-info">
                                ✓ {matchInfo.total_matches} rows matched → {matchInfo.matching_subdistricts.length} regions
                            </span>
                        )}
                        {matchError && (
                            <span className="qb-match-info error">
                                ✕ {matchError}
                            </span>
                        )}
                        <button className="qb-btn" onClick={onClose}>Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QueryBuilder;
