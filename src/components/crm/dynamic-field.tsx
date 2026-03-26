"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomFieldData {
  id: string;
  name: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  options: string | null;
  placeholder: string | null;
  helpText: string | null;
}

interface DynamicFieldProps {
  field: CustomFieldData;
  value?: string;
  onChange?: (fieldId: string, value: string) => void;
}

export function DynamicField({ field, value = "", onChange }: DynamicFieldProps) {
  const fieldName = `cf_${field.id}`;
  const isRequired = field.isRequired;

  const handleChange = (newValue: string) => {
    onChange?.(field.id, newValue);
  };

  const labelElement = (
    <Label htmlFor={fieldName}>
      {field.label}
      {isRequired && <span className="text-red-500 ml-1">*</span>}
    </Label>
  );

  switch (field.fieldType) {
    case "TEXTAREA":
      return (
        <div className="space-y-2 sm:col-span-2">
          {labelElement}
          <Textarea
            id={fieldName}
            name={fieldName}
            required={isRequired}
            defaultValue={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder || ""}
            rows={3}
          />
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "SELECT": {
      let options: string[] = [];
      try {
        options = field.options ? JSON.parse(field.options) : [];
      } catch {
        options = [];
      }

      return (
        <div className="space-y-2">
          {labelElement}
          <input type="hidden" name={fieldName} value={value} />
          <Select
            defaultValue={value}
            onValueChange={(val) => handleChange(val)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );
    }

    case "DATE":
      return (
        <div className="space-y-2">
          {labelElement}
          <Input
            id={fieldName}
            name={fieldName}
            type="date"
            required={isRequired}
            defaultValue={value}
            onChange={(e) => handleChange(e.target.value)}
          />
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "NUMBER":
    case "DECIMAL":
      return (
        <div className="space-y-2">
          {labelElement}
          <Input
            id={fieldName}
            name={fieldName}
            type="number"
            step={field.fieldType === "DECIMAL" ? "0.01" : "1"}
            required={isRequired}
            defaultValue={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder || "0"}
          />
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "CURRENCY":
      return (
        <div className="space-y-2">
          {labelElement}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              R$
            </span>
            <Input
              id={fieldName}
              name={fieldName}
              type="number"
              step="0.01"
              min="0"
              required={isRequired}
              defaultValue={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="0,00"
              className="pl-10"
            />
          </div>
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "URL":
      return (
        <div className="space-y-2">
          {labelElement}
          <Input
            id={fieldName}
            name={fieldName}
            type="url"
            required={isRequired}
            defaultValue={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder || "https://..."}
          />
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "EMAIL":
      return (
        <div className="space-y-2">
          {labelElement}
          <Input
            id={fieldName}
            name={fieldName}
            type="email"
            required={isRequired}
            defaultValue={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder || "email@exemplo.com"}
          />
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "PHONE":
      return (
        <div className="space-y-2">
          {labelElement}
          <Input
            id={fieldName}
            name={fieldName}
            type="tel"
            required={isRequired}
            defaultValue={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder || "(00) 00000-0000"}
          />
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "TEXT":
    default:
      return (
        <div className="space-y-2">
          {labelElement}
          <Input
            id={fieldName}
            name={fieldName}
            required={isRequired}
            defaultValue={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder || ""}
          />
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );
  }
}
