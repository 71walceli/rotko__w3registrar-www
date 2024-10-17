import React from 'react';

interface Identity {
  [key: string]: string;
}

const IdentityForm: React.FC = () => {
  const [_identity, _setIdentity] = useState({
    displayName: '',
    matrix: '',
    email: '',
    discord: '',
    twitter: ''
  });

  const handleChange = (key: string, value: string) => {
    _setIdentity(prev => ({ ...prev, [key]: value }));
  };
  const handleSubmitIdentity = () => {
    if (_identity.displayName.trim() === '') {
      setError('Display Name is required');
      return;
    }
    setStage(1);
    setChallenges(prev => ({
      displayName: true,
      ...Object.entries(identity).reduce((acc, [key, value]) => {
        if (key !== 'displayName' && value.trim() !== '') {
          acc[key] = { value: Math.random().toString(36).substring(2, 10), verified: false };
        }
        return acc;
      }, {} as typeof prev)
    }));
  };

  const fieldNames: { [key: string]: string } = {
    displayName: 'Display Name',
    matrix: 'Matrix',
    email: 'Email',
    discord: 'Discord',
    twitter: 'Twitter'
  };

  const placeholders: { [key: string]: string } = {
    displayName: 'Alice',
    matrix: '@alice:matrix.org',
    email: 'alice@w3reg.org',
    discord: 'alice#123',
    twitter: '@alice'
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4 text-stone-800">Identity</h2>
      {Object.entries(_identity).map(([key, value]) => (
        <div key={key} className="flex flex-col">
          <label className="text-sm text-stone-600 mb-1">{fieldNames[key]}</label>
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder={placeholders[key]}
            className="border-b border-stone-400 px-0 py-2 text-sm text-stone-800 focus:outline-none focus:border-stone-600 placeholder-stone-400"
            required={key === 'displayName'}
          />
        </div>
      ))}
      {error && <p className="text-red-700 text-sm">{error}</p>}
      <button
        onClick={handleSubmitIdentity}
        className="mt-6 w-full bg-stone-700 hover:bg-stone-800 text-white py-2 text-sm font-semibold transition duration-300"
      >
        Submit
      </button>
    </div>
  );
};

export default IdentityForm;
