/**
 * Country Code Selector
 * 国家/地区区号选择器
 */

export interface Country {
    code: string;      // ISO 3166-1 alpha-2 code
    name: string;      // English name
    nameZh: string;    // Chinese name
    dialCode: string;  // E.164 dial code
    flag: string;      // Emoji flag
}

export const countries: Country[] = [
    // Asia / 亚洲
    { code: 'CN', name: 'China', nameZh: '中国', dialCode: '+86', flag: '🇨🇳' },
    { code: 'HK', name: 'Hong Kong', nameZh: '香港', dialCode: '+852', flag: '🇭🇰' },
    { code: 'TW', name: 'Taiwan', nameZh: '台湾', dialCode: '+886', flag: '🇹🇼' },
    { code: 'MO', name: 'Macau', nameZh: '澳门', dialCode: '+853', flag: '🇲🇴' },
    { code: 'JP', name: 'Japan', nameZh: '日本', dialCode: '+81', flag: '🇯🇵' },
    { code: 'KR', name: 'South Korea', nameZh: '韩国', dialCode: '+82', flag: '🇰🇷' },
    { code: 'SG', name: 'Singapore', nameZh: '新加坡', dialCode: '+65', flag: '🇸🇬' },
    { code: 'MY', name: 'Malaysia', nameZh: '马来西亚', dialCode: '+60', flag: '🇲🇾' },
    { code: 'TH', name: 'Thailand', nameZh: '泰国', dialCode: '+66', flag: '🇹🇭' },
    { code: 'VN', name: 'Vietnam', nameZh: '越南', dialCode: '+84', flag: '🇻🇳' },
    { code: 'PH', name: 'Philippines', nameZh: '菲律宾', dialCode: '+63', flag: '🇵🇭' },
    { code: 'ID', name: 'Indonesia', nameZh: '印度尼西亚', dialCode: '+62', flag: '🇮🇩' },
    { code: 'IN', name: 'India', nameZh: '印度', dialCode: '+91', flag: '🇮🇳' },
    { code: 'PK', name: 'Pakistan', nameZh: '巴基斯坦', dialCode: '+92', flag: '🇵🇰' },
    { code: 'BD', name: 'Bangladesh', nameZh: '孟加拉国', dialCode: '+880', flag: '🇧🇩' },
    { code: 'AE', name: 'UAE', nameZh: '阿联酋', dialCode: '+971', flag: '🇦🇪' },
    { code: 'SA', name: 'Saudi Arabia', nameZh: '沙特阿拉伯', dialCode: '+966', flag: '🇸🇦' },
    { code: 'IL', name: 'Israel', nameZh: '以色列', dialCode: '+972', flag: '🇮🇱' },
    { code: 'TR', name: 'Turkey', nameZh: '土耳其', dialCode: '+90', flag: '🇹🇷' },

    // Europe / 欧洲
    { code: 'GB', name: 'United Kingdom', nameZh: '英国', dialCode: '+44', flag: '🇬🇧' },
    { code: 'DE', name: 'Germany', nameZh: '德国', dialCode: '+49', flag: '🇩🇪' },
    { code: 'FR', name: 'France', nameZh: '法国', dialCode: '+33', flag: '🇫🇷' },
    { code: 'IT', name: 'Italy', nameZh: '意大利', dialCode: '+39', flag: '🇮🇹' },
    { code: 'ES', name: 'Spain', nameZh: '西班牙', dialCode: '+34', flag: '🇪🇸' },
    { code: 'PT', name: 'Portugal', nameZh: '葡萄牙', dialCode: '+351', flag: '🇵🇹' },
    { code: 'NL', name: 'Netherlands', nameZh: '荷兰', dialCode: '+31', flag: '🇳🇱' },
    { code: 'BE', name: 'Belgium', nameZh: '比利时', dialCode: '+32', flag: '🇧🇪' },
    { code: 'CH', name: 'Switzerland', nameZh: '瑞士', dialCode: '+41', flag: '🇨🇭' },
    { code: 'AT', name: 'Austria', nameZh: '奥地利', dialCode: '+43', flag: '🇦🇹' },
    { code: 'SE', name: 'Sweden', nameZh: '瑞典', dialCode: '+46', flag: '🇸🇪' },
    { code: 'NO', name: 'Norway', nameZh: '挪威', dialCode: '+47', flag: '🇳🇴' },
    { code: 'DK', name: 'Denmark', nameZh: '丹麦', dialCode: '+45', flag: '🇩🇰' },
    { code: 'FI', name: 'Finland', nameZh: '芬兰', dialCode: '+358', flag: '🇫🇮' },
    { code: 'PL', name: 'Poland', nameZh: '波兰', dialCode: '+48', flag: '🇵🇱' },
    { code: 'RU', name: 'Russia', nameZh: '俄罗斯', dialCode: '+7', flag: '🇷🇺' },
    { code: 'UA', name: 'Ukraine', nameZh: '乌克兰', dialCode: '+380', flag: '🇺🇦' },
    { code: 'GR', name: 'Greece', nameZh: '希腊', dialCode: '+30', flag: '🇬🇷' },
    { code: 'IE', name: 'Ireland', nameZh: '爱尔兰', dialCode: '+353', flag: '🇮🇪' },

    // North America / 北美洲
    { code: 'US', name: 'United States', nameZh: '美国', dialCode: '+1', flag: '🇺🇸' },
    { code: 'CA', name: 'Canada', nameZh: '加拿大', dialCode: '+1', flag: '🇨🇦' },
    { code: 'MX', name: 'Mexico', nameZh: '墨西哥', dialCode: '+52', flag: '🇲🇽' },

    // South America / 南美洲
    { code: 'BR', name: 'Brazil', nameZh: '巴西', dialCode: '+55', flag: '🇧🇷' },
    { code: 'AR', name: 'Argentina', nameZh: '阿根廷', dialCode: '+54', flag: '🇦🇷' },
    { code: 'CL', name: 'Chile', nameZh: '智利', dialCode: '+56', flag: '🇨🇱' },
    { code: 'CO', name: 'Colombia', nameZh: '哥伦比亚', dialCode: '+57', flag: '🇨🇴' },
    { code: 'PE', name: 'Peru', nameZh: '秘鲁', dialCode: '+51', flag: '🇵🇪' },

    // Oceania / 大洋洲
    { code: 'AU', name: 'Australia', nameZh: '澳大利亚', dialCode: '+61', flag: '🇦🇺' },
    { code: 'NZ', name: 'New Zealand', nameZh: '新西兰', dialCode: '+64', flag: '🇳🇿' },

    // Africa / 非洲
    { code: 'ZA', name: 'South Africa', nameZh: '南非', dialCode: '+27', flag: '🇿🇦' },
    { code: 'EG', name: 'Egypt', nameZh: '埃及', dialCode: '+20', flag: '🇪🇬' },
    { code: 'NG', name: 'Nigeria', nameZh: '尼日利亚', dialCode: '+234', flag: '🇳🇬' },
    { code: 'KE', name: 'Kenya', nameZh: '肯尼亚', dialCode: '+254', flag: '🇰🇪' },
];

// Get default country (China)
export const defaultCountry = countries[0]; // China

// Find country by code
export function getCountryByCode(code: string): Country | undefined {
    return countries.find(c => c.code === code);
}

// Find country by dial code
export function getCountryByDialCode(dialCode: string): Country | undefined {
    return countries.find(c => c.dialCode === dialCode);
}
