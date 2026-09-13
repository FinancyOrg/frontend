import { Plus, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import type { ViewAccount } from "../api/types";

function matchesQuery(account: ViewAccount, needle: string) {
  return `${account.name} ${account.code} ${account.commodity.code}`
    .toLowerCase()
    .includes(needle);
}

export function AccountPicker({
  title,
  accounts,
  selectedId,
  disabled = false,
  error,
  onSelect,
  onAddNew,
}: {
  title: string;
  accounts: ViewAccount[];
  selectedId?: string;
  disabled?: boolean;
  error?: string;
  onSelect?: (account: ViewAccount | null) => void;
  onAddNew?: () => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedChipRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");

  const selected = accounts.find((account) => account.id === selectedId && !account.isHidden);
  const filtered = useMemo(() => {
    const visible = accounts.filter((account) => !account.isHidden);
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return visible;
    }
    return visible.filter((account) => matchesQuery(account, needle));
  }, [accounts, query]);

  useEffect(() => {
    selectedChipRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    });
  }, [selectedId]);

  const selectAccount = (account: ViewAccount) => {
    onSelect?.(account.id === selectedId ? null : account);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || disabled || filtered.length === 0) {
      return;
    }
    event.preventDefault();
    const match =
      filtered.find((account) => account.id === selectedId) ?? filtered[0];
    onSelect?.(match);
  };

  return (
    <div className={`account-picker ${disabled ? "account-picker-disabled" : ""}`}>
      <div className="account-picker-heading">
        <strong>{title}</strong>
        {selected && (
          <span>
            {selected.name} · {selected.commodity.code}
          </span>
        )}
      </div>
      {!disabled && (
        <div className="search-input account-picker-search">
          <Search size={16} />
          <input
            ref={inputRef}
            id={inputId}
            value={query}
            placeholder="Search accounts"
            aria-label={`Search ${title.toLowerCase()}`}
            autoComplete="off"
            aria-invalid={Boolean(error)}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear account search"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      <div className="chips-picker" role="list" aria-label={title}>
        {filtered.map((account) => {
          const active = account.id === selectedId;
          return (
            <button
              key={account.id}
              ref={active ? selectedChipRef : undefined}
              type="button"
              role="listitem"
              className={`picker-chip ${active ? "picker-chip-active" : ""}`}
              disabled={disabled}
              onClick={() => selectAccount(account)}
            >
              <span>{account.commodity.code}</span>
              {account.name}
            </button>
          );
        })}
        {onAddNew && !disabled && (
          <button type="button" className="picker-chip picker-chip-add" onClick={onAddNew}>
            <Plus size={15} /> Add new
          </button>
        )}
      </div>
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}
