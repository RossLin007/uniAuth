/**
 * Country Code Selector Component
 * 国家/地区区号选择器组件
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { countries, defaultCountry, type Country } from '../data/countries';

interface CountryCodeSelectorProps {
    selectedCountry: Country;
    onSelect: (country: Country) => void;
}

export default function CountryCodeSelector({ selectedCountry, onSelect }: CountryCodeSelectorProps) {
    const { i18n } = useTranslation();
    const isZh = i18n.language.startsWith('zh');

    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Filter countries based on search
    const filteredCountries = countries.filter(country => {
        const query = search.toLowerCase();
        return (
            country.name.toLowerCase().includes(query) ||
            country.nameZh.includes(query) ||
            country.dialCode.includes(query) ||
            country.code.toLowerCase().includes(query)
        );
    });

    const handleSelect = (country: Country) => {
        onSelect(country);
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className="country-selector" ref={dropdownRef}>
            <button
                type="button"
                className="country-selector-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <span className="country-flag">{selectedCountry.flag}</span>
                <span className="country-dial-code">{selectedCountry.dialCode}</span>
                <span className="country-arrow">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
                <div className="country-dropdown">
                    <div className="country-search-wrapper">
                        <input
                            ref={inputRef}
                            type="text"
                            className="country-search"
                            placeholder={isZh ? '搜索国家/地区...' : 'Search country...'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <ul className="country-list" role="listbox">
                        {filteredCountries.length === 0 ? (
                            <li className="country-no-results">
                                {isZh ? '未找到匹配的国家/地区' : 'No countries found'}
                            </li>
                        ) : (
                            filteredCountries.map((country) => (
                                <li
                                    key={country.code}
                                    className={`country-item ${country.code === selectedCountry.code ? 'selected' : ''}`}
                                    onClick={() => handleSelect(country)}
                                    role="option"
                                    aria-selected={country.code === selectedCountry.code}
                                >
                                    <span className="country-flag">{country.flag}</span>
                                    <span className="country-name">
                                        {isZh ? country.nameZh : country.name}
                                    </span>
                                    <span className="country-dial-code">{country.dialCode}</span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}

            <style>{`
                .country-selector {
                    position: relative;
                }
                
                .country-selector-trigger {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 12px 12px;
                    background: var(--color-mist, #f8fafc);
                    border: 1px solid var(--color-border, #e2e8f0);
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 14px;
                    color: var(--color-text, #1e293b);
                    transition: all 0.2s;
                    white-space: nowrap;
                }
                
                .country-selector-trigger:hover {
                    background: var(--color-bg-hover, #f1f5f9);
                    border-color: var(--color-primary, #0ea5e9);
                }
                
                .country-flag {
                    font-size: 20px;
                    line-height: 1;
                }
                
                .country-dial-code {
                    font-weight: 500;
                    color: var(--color-text-secondary, #64748b);
                }
                
                .country-arrow {
                    font-size: 10px;
                    color: var(--color-text-tertiary, #94a3b8);
                }
                
                .country-dropdown {
                    position: absolute;
                    top: calc(100% + 4px);
                    left: 0;
                    z-index: 100;
                    width: 280px;
                    max-height: 320px;
                    background: white;
                    border: 1px solid var(--color-border, #e2e8f0);
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                    animation: slideDown 0.2s ease-out;
                }
                
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .country-search-wrapper {
                    padding: 12px;
                    border-bottom: 1px solid var(--color-border, #e2e8f0);
                }
                
                .country-search {
                    width: 100%;
                    padding: 8px 12px;
                    font-size: 14px;
                    border: 1px solid var(--color-border, #e2e8f0);
                    border-radius: 8px;
                    outline: none;
                    transition: border-color 0.2s;
                }
                
                .country-search:focus {
                    border-color: var(--color-primary, #0ea5e9);
                }
                
                .country-list {
                    list-style: none;
                    margin: 0;
                    padding: 8px 0;
                    max-height: 240px;
                    overflow-y: auto;
                }
                
                .country-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 16px;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                
                .country-item:hover {
                    background: var(--color-bg-hover, #f8fafc);
                }
                
                .country-item.selected {
                    background: var(--color-primary-light, #e0f2fe);
                    color: var(--color-primary, #0ea5e9);
                }
                
                .country-item .country-name {
                    flex: 1;
                    font-size: 14px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .country-item .country-dial-code {
                    font-size: 13px;
                    color: var(--color-text-tertiary, #94a3b8);
                }
                
                .country-no-results {
                    padding: 16px;
                    text-align: center;
                    color: var(--color-text-tertiary, #94a3b8);
                    font-size: 14px;
                }
                
                /* Dark mode */
                @media (prefers-color-scheme: dark) {
                    .country-selector-trigger {
                        background: #1e293b;
                        border-color: #334155;
                        color: #e2e8f0;
                    }
                    
                    .country-selector-trigger:hover {
                        background: #334155;
                    }
                    
                    .country-dropdown {
                        background: #1e293b;
                        border-color: #334155;
                    }
                    
                    .country-search-wrapper {
                        border-color: #334155;
                    }
                    
                    .country-search {
                        background: #0f172a;
                        border-color: #334155;
                        color: #e2e8f0;
                    }
                    
                    .country-item:hover {
                        background: #334155;
                    }
                    
                    .country-item.selected {
                        background: #0c4a6e;
                    }
                }
            `}</style>
        </div>
    );
}

export { defaultCountry };
