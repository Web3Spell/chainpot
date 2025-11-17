'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CreatePotFormProps {
  isDarkMode: boolean;
}

type CycleFrequency = 'weekly' | 'biweekly' | 'monthly';

interface FormData {
  name: string;
  amountPerCycle: string;
  cycleDuration: string;
  cycleCount: string;
  frequency: CycleFrequency;
  bidDepositDeadline: string;
  minMembers: string;
  maxMembers: string;
}

export function CreatePotForm({ isDarkMode }: CreatePotFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    amountPerCycle: '',
    cycleDuration: '',
    cycleCount: '',
    frequency: 'weekly',
    bidDepositDeadline: '',
    minMembers: '',
    maxMembers: '',
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<FormData> = {};

    if (!formData.name.trim()) newErrors.name = 'Pot name is required';
    if (!formData.amountPerCycle || parseFloat(formData.amountPerCycle) <= 0)
      newErrors.amountPerCycle = 'Amount must be greater than 0';
    if (!formData.cycleDuration || parseFloat(formData.cycleDuration) <= 0)
      newErrors.cycleDuration = 'Duration must be greater than 0';
    if (!formData.cycleCount || parseInt(formData.cycleCount) <= 0)
      newErrors.cycleCount = 'Must have at least 1 cycle';
    if (!formData.bidDepositDeadline || parseFloat(formData.bidDepositDeadline) <= 0)
      newErrors.bidDepositDeadline = 'Deadline must be greater than 0';
    if (!formData.minMembers || parseInt(formData.minMembers) <= 0)
      newErrors.minMembers = 'Minimum members required';
    if (!formData.maxMembers || parseInt(formData.maxMembers) <= 0)
      newErrors.maxMembers = 'Maximum members required';
    if (
      parseInt(formData.minMembers) > parseInt(formData.maxMembers)
    ) {
      newErrors.maxMembers = 'Max members must be greater than min members';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('[v0] Form submitted:', formData);
      alert('Pot created successfully! (This is a demo)');
    }
  };

  const FormInput = ({
    label,
    name,
    type = 'text',
    placeholder,
    value,
    onChange,
    error,
  }: {
    label: string;
    name: keyof FormData;
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
  }) => (
    <div className="flex flex-col gap-2">
      <label className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`px-4 py-3 rounded-lg border-2 transition-colors duration-300 ${
          error
            ? isDarkMode
              ? 'border-red-500/50 bg-red-500/10'
              : 'border-red-500 bg-red-50'
            : isDarkMode
            ? ' text-white bg-white/5'
            : 'bg-white border-black text-black hover:bg-black/5'
        } focus:outline-none`}
      />
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );

  return (
    <div className="mb-12">
      <div className="mb-8">
        <h1 className="text-5xl md:text-6xl font-black mb-4">
          <span className="block underline decoration-2 underline-offset-4">Create Your Pot</span>
        </h1>
        <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Launch a new ROSCA pool and start building community wealth
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`p-8 rounded-2xl border-3 border-black transition-colors duration-300 ${
          isDarkMode
              ? ' text-white bg-white/5'
              : 'bg-white border-black text-black hover:bg-black/5'
          }`}
      >
        {/* Basic Information */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Pot Name"
              name="name"
              placeholder="e.g., Tech Startup Fund"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
            />
          </div>
        </div>

        {/* Financial Parameters */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            Financial Parameters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Amount Per Cycle (USD)"
              name="amountPerCycle"
              type="number"
              placeholder="e.g., 5000"
              value={formData.amountPerCycle}
              onChange={handleChange}
              error={errors.amountPerCycle}
            />
            <FormInput
              label="Bid Deposit Deadline (days)"
              name="bidDepositDeadline"
              type="number"
              placeholder="e.g., 5"
              value={formData.bidDepositDeadline}
              onChange={handleChange}
              error={errors.bidDepositDeadline}
            />
          </div>
        </div>

        {/* Cycle Configuration */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            Cycle Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Cycle Duration (days)"
              name="cycleDuration"
              type="number"
              placeholder="e.g., 7"
              value={formData.cycleDuration}
              onChange={handleChange}
              error={errors.cycleDuration}
            />
            <FormInput
              label="Total Cycles"
              name="cycleCount"
              type="number"
              placeholder="e.g., 12"
              value={formData.cycleCount}
              onChange={handleChange}
              error={errors.cycleCount}
            />
            <div className="flex flex-col gap-2">
              <label className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                Frequency
              </label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                className={`px-4 py-3 rounded-lg border-2 border-black transition-colors duration-300 ${
                  isDarkMode
              ? ' text-white bg-white/5'
              : 'bg-white border-black text-black hover:bg-black/5'
          } focus:outline-none focus:border-white/50`}
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Member Limits */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
            Member Requirements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Minimum Members"
              name="minMembers"
              type="number"
              placeholder="e.g., 5"
              value={formData.minMembers}
              onChange={handleChange}
              error={errors.minMembers}
            />
            <FormInput
              label="Maximum Members"
              name="maxMembers"
              type="number"
              placeholder="e.g., 20"
              value={formData.maxMembers}
              onChange={handleChange}
              error={errors.maxMembers}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-8 border-t border-white/10">
          <button
            type="submit"
            className={`flex-1 px-8 py-3 rounded-full font-bold text-lg transition-all duration-300 ${
              isDarkMode
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-black text-white hover:bg-black/90'
            }`}
          >
            Create Pot
          </button>
          <Link
            href="/pots"
            className={`flex-1 px-8 py-3 rounded-full font-bold text-lg transition-all duration-300 text-center border-3 ${
              isDarkMode
                ? 'border-white/30 text-white hover:bg-white/10'
                : 'border-black text-black hover:bg-black/10'
            }`}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
