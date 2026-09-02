'use client';

import { useState, useEffect } from 'react';

interface ShopItem {
  id: string;
  name: string;
  tag: string;
  count?: number;
}

const TAGS = ['Vegetable', 'Fruit', 'Meat', 'Dairy', 'Bread', 'Grain', 'Spice', 'Other'];

export default function ShoppingPage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedTag, setSelectedTag] = useState(TAGS[0]);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    localStorage.removeItem('prepbite-shopping-badge');
    const saved = localStorage.getItem('prepbite-shopping');
    if (saved) setItems(JSON.parse(saved));
  }, []);

  const save = (data: ShopItem[]) => {
    setItems(data);
    localStorage.setItem('prepbite-shopping', JSON.stringify(data));
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    save([{ id: Date.now().toString(), name: newName.trim(), tag: selectedTag }, ...items]);
    setNewName('');
    setShowAdd(false);
  };

  const handleRemove = (id: string) => save(items.filter(i => i.id !== id));

  const handleRemoveAll = () => {
    save([]);
    setShowRemoveConfirm(false);
    setToastMessage('All items removed successfully!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="animate-slide-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="heading-lg">Shopping List</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {items.length > 0 && (
            <button className="btn-cancel-red" onClick={() => setShowRemoveConfirm(true)} style={{ padding: '0.5rem 1rem' }}>
              Remove All
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} style={{ padding: '0.5rem 1rem' }}>
            {showAdd ? 'Cancel' : 'Add +'}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="glass-card animate-slide-up" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div className="add-bar">
            <input className="input" placeholder="e.g. Almond Milk" value={newName}
              onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
            <button className="btn btn-primary" onClick={handleAdd}>Save</button>
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

      <div>
        {items.length === 0 ? (
          <div style={{ marginTop: '3rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
            <p className="heading-md" style={{ marginBottom: '0.5rem' }}>List is empty</p>
            <p style={{ color: 'var(--text-muted)' }}>Missing ingredients from recipes will appear here.</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="list-item">
              <div className="list-item-content">
                <span style={{ fontWeight: 500 }}>
                  {item.name}{item.count && item.count > 1 ? ` x${item.count}` : ''}
                </span>
                <span className="ingredient-tag selected" style={{ cursor: 'default', fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>{item.tag}</span>
              </div>
              <button className="ingredient-remove-btn" onClick={() => handleRemove(item.id)}>✕</button>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up">
            <h2 className="heading-md" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Are you sure you want to remove all items?</h2>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn-cancel-red" style={{ flex: 1 }} onClick={() => setShowRemoveConfirm(false)}>Nah!</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRemoveAll}>Yep!</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast animate-slide-up">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
