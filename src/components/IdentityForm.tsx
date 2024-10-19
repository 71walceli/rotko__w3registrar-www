import React, { useEffect, useRef, useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { appState } from '~/App';

type FieldKey = 'display' | 'matrix' | 'email' | 'discord' | 'twitter';

type Identity = {
  [K in FieldKey]: string;
};

type FieldError = {
  [K in FieldKey]?: string;
};

const FIELD_CONFIG: Record<FieldKey, { label: string; placeholder: string; validate: (value: string) => string | null }> = {
  display: {
    label: 'Display Name',
    placeholder: 'Alice',
    validate: (v) => v.length > 0 && v.length < 3 ? "At least 3 characters" : null,
  },
  matrix: {
    label: 'Matrix',
    placeholder: '@alice:matrix.org',
    validate: (v) => v.length > 0 && !/@[a-zA-Z0-9._=-]+:[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(v) ? "Invalid format" : null,
  },
  email: {
    label: 'Email',
    placeholder: 'alice@example.org',
    validate: (v) => v.length > 0 && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v) ? "Invalid format" : null,
  },
  discord: {
    label: 'Discord',
    placeholder: 'alice#1234',
    validate: (v) => v.length > 0 && !/^[a-zA-Z0-9_]{2,32}#\d{4}$/.test(v) ? "Invalid format" : null,
  },
  twitter: {
    label: 'Twitter',
    placeholder: '@alice',
    validate: (v) => v.length > 0 && !/^@?(\w){1,15}$/.test(v) ? "Invalid format" : null,
  },
};

// Re-export IdentityFormFields if it's still needed elsewhere
export const IdentityFormFields: FieldKey[] = Object.keys(FIELD_CONFIG) as FieldKey[];

const IdentityForm: React.FC = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { identity: appStateIdentity } = useSnapshot(appState);

  const validateForm = useCallback(() => {
    if (!formRef.current) return { isValid: false, errors: {} };

    const formData = new FormData(formRef.current);
    const identity: Partial<Identity> = {};
    const errors: FieldError = {};
    let isValid = false;

    IdentityFormFields.forEach((key) => {
      const value = formData.get(key) as string;
      identity[key] = value;
      const error = FIELD_CONFIG[key].validate(value);
      if (error) errors[key] = error;
      if (value.length > 0) isValid = true;
    });

    isValid = isValid && Object.keys(errors).length === 0;
    return { isValid, errors, identity };
  }, []);

  const handleInput = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const { isValid, errors, identity } = validateForm();
      if (isValid) {
        appState.identity = identity as Identity;
      }
      formRef.current?.querySelector('button[type="submit"]')?.toggleAttribute('disabled', !isValid);
      IdentityFormFields.forEach((key) => {
        const errorElement = formRef.current?.querySelector(`[data-error="${key}"]`);
        if (errorElement) {
          errorElement.textContent = errors[key] || '';
        }
      });
    }, 300);
  }, [validateForm]);

  const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { isValid, identity } = validateForm();
    console.log({ isValid, identity })
    if (isValid) {
      appState.stage = 1;
      appState.challenges = Object.fromEntries(
        Object.keys(identity).map(key => [key, { value: crypto.randomUUID(), verified: false }])
      );
    }
  }, [validateForm]);

  useEffect(() => {
    if (appStateIdentity && formRef.current) {
      Object.entries(appStateIdentity).forEach(([key, value]) => {
        const input = formRef.current?.querySelector(`input[name="${key}"]`) as HTMLInputElement;
        if (input) input.value = value;
      });
      handleInput();
    }
  }, [appStateIdentity, handleInput]);

  const actionMessage = appStateIdentity ? "Update your identity" : "Create your identity";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
      <h2 className="text-xl font-bold mb-4 text-stone-800">Identity</h2>
      <p className="text-sm text-stone-600 mb-4">{actionMessage}</p>
      {IdentityFormFields.map((key) => (
        <div key={key} className="flex flex-col">
          <label htmlFor={key} className="text-sm text-stone-600 mb-1">{FIELD_CONFIG[key].label}</label>
          <input
            id={key}
            name={key}
            type="text"
            placeholder={FIELD_CONFIG[key].placeholder}
            className="border-b border-stone-400 px-0 py-2 text-sm text-stone-800 focus:outline-none focus:border-stone-600 placeholder-stone-400"
            onInput={handleInput}
          />
          <p data-error={key} className="text-red-700 text-sm h-5"></p>
        </div>
      ))}
      <button
        type="submit"
        className="mt-6 w-full bg-stone-700 hover:bg-stone-800 text-white py-2 px-4 text-sm font-semibold transition duration-300 disabled:bg-stone-400 disabled:cursor-not-allowed rounded border-none outline-none"
        onClick={e => handleSubmit(e)}
      >
        Sign
      </button>
    </form>
  );
};

export default IdentityForm;
