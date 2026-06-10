import React, { useState, useEffect } from 'react';
import { Modal } from './common/Modal';
import { Input } from './common/Input';
import { Button } from './common/Button';
import { Avatar } from './common/Avatar';
import * as api from '../api';

export function ProfileModal({ isOpen, onClose, user, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    baseHourlyRate: '',
    maxHoursPerWeek: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      const profile = await api.getMyProfile();
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        baseHourlyRate: profile.baseHourlyRate || '',
        maxHoursPerWeek: profile.maxHoursPerWeek || '',
      });
    } catch (e) {
      console.error("Failed to load profile", e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateMyProfile({
        name: formData.name,
        baseHourlyRate: Number(formData.baseHourlyRate),
        maxHoursPerWeek: Number(formData.maxHoursPerWeek)
      });
      onUpdate(formData.name);
      onClose();
    } catch (e) {
      alert("Failed to update profile: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profile & Settings">
      <div className="flex flex-col items-center mb-6">
        <Avatar name={formData.name || user?.name} size="xl" className="mb-4 shadow-sm" />
        <p className="text-body-sm text-on-surface-variant text-center max-w-xs">
          Profile pictures are auto-generated from your name using UI-Avatars.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input 
          label="Full Name" 
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          required
        />
        
        <Input 
          label="Email Address (Cannot be changed)" 
          value={formData.email}
          disabled
        />

        <div className="flex gap-4">
          <Input 
            label="Base Hourly Rate (₹)" 
            type="number"
            value={formData.baseHourlyRate}
            onChange={e => setFormData({...formData, baseHourlyRate: e.target.value})}
            min="0"
          />
          <Input 
            label="Max Hours / Week" 
            type="number"
            value={formData.maxHoursPerWeek}
            onChange={e => setFormData({...formData, maxHoursPerWeek: e.target.value})}
            min="0"
            max="168"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-outline-variant">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" isLoading={loading}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
}
