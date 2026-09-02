'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UpgradeModal from '../../components/UpgradeModal';
import { isBetaTester } from '../../../lib/betaTester';

interface Ingredient {
  id: string;
  name: string;
  tag: string;
}

const TAGS = ['Vegetable', 'Fruit', 'Meat', 'Dairy', 'Bread', 'Grain', 'Spice', 'Other'];

export default function IngredientsPage() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [selectedTag, setSelectedTag] = useState(TAGS[0]);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isPro = typeof window !== 'undefined' && (localStorage.getItem('prepbite-is-pro') === 'true' || isBetaTester());
  const FREE_LIMIT = 3;
  const getGenCount = (): number => {
    if (typeof window === 'undefined') return 0;
    const currentMonth = new Date().getMonth().toString();
    const savedMonth = localStorage.getItem('prepbite-gen-month');
    if (savedMonth !== currentMonth) return 0;
    return parseInt(localStorage.getItem('prepbite-gen-count') || '0', 10);
  };
  const genCount = getGenCount();

  useEffect(() => {
    const saved = localStorage.getItem('prepbite-ingredients');
    if (saved) setIngredients(JSON.parse(saved));
  }, []);

  const save = (data: Ingredient[]) => {
    setIngredients(data);
    localStorage.setItem('prepbite-ingredients', JSON.stringify(data));
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setNameInput('');
    setSelectedTag(TAGS[0]);
    setShowAdd(true);
  };

  const handleOpenEdit = (ing: Ingredient) => {
    setShowAdd(false);
    setEditingId(ing.id);
    setNameInput(ing.name);
    setSelectedTag(ing.tag);
  };

  const handleCancelForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setNameInput('');
  };

  const handleSaveAdd = () => {
    if (!nameInput.trim()) return;
    save([{ id: Date.now().toString(), name: nameInput.trim(), tag: selectedTag }, ...ingredients]);
    setNameInput('');
    setShowAdd(false);
  };

  const handleSaveEdit = () => {
    if (!nameInput.trim() || !editingId) return;
    const updated = ingredients.map(ing =>
      ing.id === editingId ? { ...ing, name: nameInput.trim(), tag: selectedTag } : ing
    );
    save(updated);
    setEditingId(null);
    setNameInput('');
  };

  const handleRemove = (id: string) => {
    if (editingId === id) setEditingId(null);
    save(ingredients.filter(i => i.id !== id));
  };

  const handleRemoveAll = () => {
    save([]);
    setShowRemoveConfirm(false);
    setToastMessage('All ingredients removed successfully!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="animate-slide-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="heading-lg">Ingredients</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {ingredients.length > 0 && (
            <button className="btn-cancel-red" onClick={() => setShowRemoveConfirm(true)} style={{ padding: '0.5rem 1rem' }}>
              Remove All
            </button>
          )}
          <button className="btn btn-primary" onClick={showAdd || editingId ? handleCancelForm : handleOpenAdd} style={{ padding: '0.5rem 1rem' }}>
            {showAdd || editingId ? 'Cancel' : 'Add +'}
          </button>
        </div>
      </div>

      {/* Add Form Panel */}
      {showAdd && (
        <div className="glass-card animate-slide-up" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 className="heading-sm" style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Add New Ingredient</h3>
          <div className="add-bar">
            <input className="input" placeholder="e.g. Chicken Breast" value={nameInput}
              onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveAdd()} autoFocus />
            <button className="btn btn-primary" onClick={handleSaveAdd}>Save</button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {TAGS.map(t => (
              <button key={t} className={`ingredient-tag ${selectedTag === t ? 'selected' : ''}`} onClick={() => setSelectedTag(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edit Form Panel */}
      {editingId && (
        <div className="glass-card animate-slide-up" style={{ padding: '1.5rem', marginBottom: '2rem', border: '2px solid var(--accent)' }}>
          <h3 className="heading-sm" style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Edit Ingredient</h3>
          <div className="add-bar" style={{ marginBottom: '1rem' }}>
            <input className="input" placeholder="Ingredient name..." value={nameInput}
              onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveEdit()} autoFocus />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {TAGS.map(t => (
              <button key={t} className={`ingredient-tag ${selectedTag === t ? 'selected' : ''}`} onClick={() => setSelectedTag(t)}>
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn-cancel-red" onClick={handleCancelForm}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveEdit}>
              Confirm Edit
            </button>
          </div>
        </div>
      )}

      {/* Ingredients List */}
      <div>
        {ingredients.length === 0 ? (
          <div style={{ marginTop: '3rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧊</div>
            <p className="heading-md" style={{ marginBottom: '0.5rem' }}>Fridge is empty</p>
            <p style={{ color: 'var(--text-muted)' }}>Add some ingredients to get recipe recommendations!</p>
          </div>
        ) : (
          ingredients.map(ing => (
            <div key={ing.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div className="list-item" style={{ flex: 1, marginBottom: 0, ...(editingId === ing.id ? { borderColor: 'var(--accent)', background: 'rgba(0,255,135,0.05)' } : {}) }}>
                <div className="list-item-content">
                  <span style={{ fontWeight: 500 }}>{ing.name}</span>
                  <span className="ingredient-tag selected" style={{ cursor: 'default', fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>{ing.tag}</span>
                </div>
                <button className="ingredient-remove-btn" title="Remove ingredient" onClick={() => handleRemove(ing.id)}>✕</button>
              </div>
              <button className="ingredient-edit-btn" title="Edit ingredient" onClick={() => handleOpenEdit(ing)}>
                ⋮
              </button>
            </div>
          ))
        )}
      </div>

      {/* Generate Button */}
      <button className="btn btn-primary" style={{
          width: '100%', marginTop: '2rem',
          opacity: ingredients.length === 0 || isNavigating ? 0.5 : 1,
          cursor: ingredients.length === 0 || isNavigating ? 'not-allowed' : 'pointer',
        }}
        onClick={() => {
          if (isNavigating) return;
          // Check free limit
          if (!isPro && genCount >= FREE_LIMIT) {
            setShowUpgrade(true);
            return;
          }
          if (localStorage.getItem('prepbite-mealplan')) {
            setShowGenerateConfirm(true);
          } else {
            setIsNavigating(true);
            router.push('/app/recipes');
          }
        }} 
        disabled={ingredients.length === 0 || isNavigating}>
        {isNavigating ? 'Loading...' : 'Generate Recipes 🍳'}
      </button>
      {!isPro && (
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          {genCount}/{FREE_LIMIT} free generations used this month
        </p>
      )}

      {/* Remove All Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up">
            <h2 className="heading-md" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Are you sure you want to remove all ingredients?</h2>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn-cancel-red" style={{ flex: 1 }} onClick={() => setShowRemoveConfirm(false)}>Nah!</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRemoveAll}>Yep!</button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Confirmation Modal */}
      {showGenerateConfirm && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up">
            <h2 className="heading-md" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Are you sure? This might change the recipes you confirmed.</h2>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn-cancel-red" style={{ flex: 1 }} onClick={() => setShowGenerateConfirm(false)}>Nah!</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setShowGenerateConfirm(false); setIsNavigating(true); router.push('/app/recipes'); }}>Yep!</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification animate-slide-up">
          {toastMessage}
        </div>
      )}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}
