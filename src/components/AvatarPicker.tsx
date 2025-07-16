import React from "react";

const AVATAR_URLS = [
    "/oss-chatbot-avatar.png",
    "/oss-logo.png",
    "/placeholder.svg"
];

export interface AvatarPickerProps {
    value: string;
    onChange: (url: string) => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ value, onChange }) => (
    <div className="flex space-x-4">
        {AVATAR_URLS.map((url) => (
            <button
                key={url}
                type="button"
                className={`rounded-full border-2 ${value === url ? "border-blue-500" : "border-transparent"}`}
                onClick={() => onChange(url)}
            >
                <img src={url} alt="avatar" className="w-12 h-12 rounded-full" />
            </button>
        ))}
    </div>
);