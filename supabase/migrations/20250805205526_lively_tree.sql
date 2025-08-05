-- Create a function to update admin_settings if a key exists, otherwise insert it
CREATE OR REPLACE FUNCTION update_or_insert_admin_setting(
    setting_key TEXT,
    setting_value TEXT,
    setting_description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.admin_settings (key, value, description)
    VALUES (setting_key, setting_value, setting_description)
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, public.admin_settings.description),
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Update hero_subtitle
SELECT update_or_insert_admin_setting(
    'hero_subtitle',
    'Pay bills, shop online, and manage your digital life all in one secure platform.',
    'Subtitle for the hero section on the homepage.'
);

-- Update footer contact info
SELECT update_or_insert_admin_setting(
    'footer_phone',
    '+234 907 599 2464',
    'Phone number displayed in the footer.'
);

SELECT update_or_insert_admin_setting(
    'footer_email',
    'support@haamannetwork.com',
    'Email address displayed in the footer.'
);

SELECT update_or_insert_admin_setting(
    'footer_address',
    'Lagos, Nigeria',
    'Physical address displayed in the footer.'
);

SELECT update_or_insert_admin_setting(
    'footer_company_name',
    'Haaman Network',
    'Company name displayed in the footer.'
);

-- Rename API settings keys from maskawa to smeplug
UPDATE public.api_settings
SET key_name = 'smeplug_token'
WHERE key_name = 'maskawa_token';

UPDATE public.api_settings
SET key_name = 'smeplug_base_url'
WHERE key_name = 'maskawa_base_url';

-- Insert default smeplug settings if they don't exist (after potential renames)
INSERT INTO public.api_settings (key_name, key_value, description)
VALUES 
    ('smeplug_token', 'YOUR_SMEPLUG_TOKEN_HERE', 'API token for SME Plug integration'),
    ('smeplug_base_url', 'https://smeplug.ng/api/v1', 'Base URL for SME Plug API')
ON CONFLICT (key_name) DO NOTHING;

-- Drop the helper function
DROP FUNCTION update_or_insert_admin_setting(TEXT, TEXT, TEXT);