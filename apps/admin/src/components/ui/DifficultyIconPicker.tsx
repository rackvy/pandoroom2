interface DifficultyIconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const PRESETS = ['🔥', '💀', '🧠', '⚡', '🎯', '👻', '🧩', '💣', '🕵️', '🚀', '❄️', '🌋'];

/**
 * Выбор эмодзи-иконки сложности.
 * Пустое значение = иконка по умолчанию (🔥).
 */
export default function DifficultyIconPicker({ value, onChange }: DifficultyIconPickerProps) {
  const effective = value || '🔥';

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {PRESETS.map((emoji) => {
          const selected = effective === emoji;
          return (
            <button
              key={emoji}
              type="button"
              title={emoji === '🔥' ? 'По умолчанию' : undefined}
              onClick={() => onChange(emoji === '🔥' ? '' : emoji)}
              style={{
                width: 38,
                height: 38,
                fontSize: 20,
                lineHeight: 1,
                cursor: 'pointer',
                borderRadius: 8,
                background: selected ? '#FFF0F0' : 'white',
                border: selected ? '2px solid #FF4444' : '1px solid #E5E5E5',
                padding: 0,
              }}
            >
              {emoji}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          value={value && !PRESETS.includes(value) ? value : ''}
          placeholder="Свой эмодзи, например 🦖"
          maxLength={8}
          onChange={(e) => onChange(e.target.value.trim())}
          style={{
            width: 200,
            padding: '8px 10px',
            border: '1px solid #E5E5E5',
            borderRadius: 6,
            fontSize: 14,
            background: 'white',
          }}
        />
        <span style={{ fontSize: 13, color: '#888' }}>
          Сейчас: <span style={{ fontSize: 18 }}>{effective}</span>
          {!value && ' (по умолчанию)'}
        </span>
      </div>
    </div>
  );
}
