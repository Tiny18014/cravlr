import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone } from "lucide-react";

// Common country codes with flags
const countryCodes = [
  { code: "+977", country: "NP", flag: "🇳🇵", name: "Nepal" },
  { code: "+1", country: "US", flag: "🇺🇸", name: "United States" },
  { code: "+1", country: "CA", flag: "🇨🇦", name: "Canada" },
  { code: "+44", country: "GB", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+91", country: "IN", flag: "🇮🇳", name: "India" },
  { code: "+61", country: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "+49", country: "DE", flag: "🇩🇪", name: "Germany" },
  { code: "+33", country: "FR", flag: "🇫🇷", name: "France" },
  { code: "+39", country: "IT", flag: "🇮🇹", name: "Italy" },
  { code: "+34", country: "ES", flag: "🇪🇸", name: "Spain" },
  { code: "+81", country: "JP", flag: "🇯🇵", name: "Japan" },
  { code: "+86", country: "CN", flag: "🇨🇳", name: "China" },
  { code: "+82", country: "KR", flag: "🇰🇷", name: "South Korea" },
  { code: "+55", country: "BR", flag: "🇧🇷", name: "Brazil" },
  { code: "+52", country: "MX", flag: "🇲🇽", name: "Mexico" },
  { code: "+31", country: "NL", flag: "🇳🇱", name: "Netherlands" },
  { code: "+46", country: "SE", flag: "🇸🇪", name: "Sweden" },
  { code: "+47", country: "NO", flag: "🇳🇴", name: "Norway" },
  { code: "+45", country: "DK", flag: "🇩🇰", name: "Denmark" },
  { code: "+358", country: "FI", flag: "🇫🇮", name: "Finland" },
  { code: "+48", country: "PL", flag: "🇵🇱", name: "Poland" },
  { code: "+43", country: "AT", flag: "🇦🇹", name: "Austria" },
  { code: "+41", country: "CH", flag: "🇨🇭", name: "Switzerland" },
  { code: "+32", country: "BE", flag: "🇧🇪", name: "Belgium" },
  { code: "+351", country: "PT", flag: "🇵🇹", name: "Portugal" },
  { code: "+353", country: "IE", flag: "🇮🇪", name: "Ireland" },
  { code: "+64", country: "NZ", flag: "🇳🇿", name: "New Zealand" },
  { code: "+65", country: "SG", flag: "🇸🇬", name: "Singapore" },
  { code: "+60", country: "MY", flag: "🇲🇾", name: "Malaysia" },
  { code: "+63", country: "PH", flag: "🇵🇭", name: "Philippines" },
  { code: "+66", country: "TH", flag: "🇹🇭", name: "Thailand" },
  { code: "+62", country: "ID", flag: "🇮🇩", name: "Indonesia" },
  { code: "+84", country: "VN", flag: "🇻🇳", name: "Vietnam" },
  { code: "+27", country: "ZA", flag: "🇿🇦", name: "South Africa" },
  { code: "+234", country: "NG", flag: "🇳🇬", name: "Nigeria" },
  { code: "+20", country: "EG", flag: "🇪🇬", name: "Egypt" },
  { code: "+971", country: "AE", flag: "🇦🇪", name: "UAE" },
  { code: "+966", country: "SA", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+972", country: "IL", flag: "🇮🇱", name: "Israel" },
  { code: "+90", country: "TR", flag: "🇹🇷", name: "Turkey" },
  { code: "+7", country: "RU", flag: "🇷🇺", name: "Russia" },
  { code: "+380", country: "UA", flag: "🇺🇦", name: "Ukraine" },
  { code: "+54", country: "AR", flag: "🇦🇷", name: "Argentina" },
  { code: "+56", country: "CL", flag: "🇨🇱", name: "Chile" },
  { code: "+57", country: "CO", flag: "🇨🇴", name: "Colombia" },
  { code: "+51", country: "PE", flag: "🇵🇪", name: "Peru" },
];

// Phone number validation: Allow 6-15 digits for international compatibility
const MAX_PHONE_DIGITS = 15;
const MIN_PHONE_DIGITS = 6;

interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  required?: boolean;
  label?: string;
  placeholder?: string;
  description?: string;
  onValidationChange?: (isValid: boolean, error: string | null) => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  required = false,
  label = "Phone Number",
  placeholder = "555 123 4567",
  description,
  onValidationChange,
}) => {
  const [phoneError, setPhoneError] = useState<string | null>(null);
  // Parse the value to extract country code and number
  const parsePhoneNumber = (phone: string) => {
    if (!phone) return { countryCode: "+1", number: "" };

    // Try to find matching country code
    for (const country of countryCodes) {
      if (phone.startsWith(country.code)) {
        return {
          countryCode: country.code,
          number: phone.slice(country.code.length).trim(),
        };
      }
    }

    // Default to US if no match
    return { countryCode: "+1", number: phone.replace(/^\+\d+\s*/, "") };
  };

  const parsed = parsePhoneNumber(value);
  const [countryCode, setCountryCode] = useState(parsed.countryCode);
  const [phoneNumber, setPhoneNumber] = useState(parsed.number);

  const validatePhoneNumber = (digitsOnly: string): { isValid: boolean; error: string | null } => {
    if (!digitsOnly) {
      return { isValid: true, error: null }; // Empty is valid (handled by required prop)
    }
    
    if (digitsOnly.length > MAX_PHONE_DIGITS) {
      return { 
        isValid: false, 
        error: `Phone number must be ${MIN_PHONE_DIGITS}-${MAX_PHONE_DIGITS} digits.` 
      };
    }
    
    if (digitsOnly.length > 0 && digitsOnly.length < MIN_PHONE_DIGITS) {
      return { 
        isValid: false, 
        error: `Phone number must be ${MIN_PHONE_DIGITS}-${MAX_PHONE_DIGITS} digits.` 
      };
    }
    
    return { isValid: true, error: null };
  };

  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode);
    const digitsOnly = phoneNumber.replace(/[\s-]/g, "");
    const fullNumber = digitsOnly ? `${newCode}${digitsOnly}` : "";
    
    // Re-validate
    const validation = validatePhoneNumber(digitsOnly);
    setPhoneError(validation.error);
    onValidationChange?.(validation.isValid, validation.error);
    
    onChange(fullNumber);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers, spaces, and dashes
    const cleanValue = e.target.value.replace(/[^\d\s-]/g, "");
    const digitsOnly = cleanValue.replace(/[\s-]/g, "");
    
    // Prevent typing more than 10 digits
    if (digitsOnly.length > MAX_PHONE_DIGITS) {
      return;
    }
    
    // Validate the phone number
    const validation = validatePhoneNumber(digitsOnly);
    setPhoneError(validation.error);
    onValidationChange?.(validation.isValid, validation.error);
    
    setPhoneNumber(cleanValue);
    const fullNumber = digitsOnly ? `${countryCode}${digitsOnly}` : "";
    onChange(fullNumber);
  };

  // Get unique country codes for display (some countries share codes)
  const uniqueCountryCodes = countryCodes.reduce(
    (acc, country) => {
      const key = `${country.code}-${country.country}`;
      if (!acc.find((c) => `${c.code}-${c.country}` === key)) {
        acc.push(country);
      }
      return acc;
    },
    [] as typeof countryCodes,
  );

  return (
    <div className="space-y-2">
      <Label htmlFor="phoneNumber" className="flex items-center gap-2">
        <Phone className="h-4 w-4" />
        {label}
        {!required && <span className="text-muted-foreground text-xs">(Optional)</span>}
      </Label>
      <div className="flex gap-2">
        <Select
          value={`${countryCode}-${uniqueCountryCodes.find((c) => c.code === countryCode)?.country || "US"}`}
          onValueChange={(val) => handleCountryChange(val.split("-")[0])}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Code" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {uniqueCountryCodes.map((country) => (
              <SelectItem key={`${country.code}-${country.country}`} value={`${country.code}-${country.country}`}>
                <span className="flex items-center gap-2">
                  <span>{country.flag}</span>
                  <span>{country.code}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id="phoneNumber"
          type="tel"
          placeholder={placeholder}
          value={phoneNumber}
          onChange={handleNumberChange}
          required={required}
          className={`flex-1 ${phoneError ? 'border-destructive' : ''}`}
        />
      </div>
      {phoneError && (
        <p className="text-xs text-destructive">{phoneError}</p>
      )}
      {!phoneError && description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
};

export default PhoneInput;
