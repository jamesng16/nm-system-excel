-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create files table
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    size BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    processed_rows INTEGER NOT NULL DEFAULT 0,
    total_rows INTEGER NOT NULL DEFAULT 0,
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create excel_data_rows table
CREATE TABLE IF NOT EXISTS public.excel_data_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create excel_row_images table
CREATE TABLE IF NOT EXISTS public.excel_row_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    row_id UUID NOT NULL REFERENCES public.excel_data_rows(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create processing_logs table
CREATE TABLE IF NOT EXISTS public.processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_excel_data_rows_file_id ON public.excel_data_rows(file_id);
CREATE INDEX IF NOT EXISTS idx_excel_data_rows_content_gin ON public.excel_data_rows USING gin (content);

CREATE INDEX IF NOT EXISTS idx_excel_row_images_row_id ON public.excel_row_images(row_id);
CREATE INDEX IF NOT EXISTS idx_excel_row_images_file_id ON public.excel_row_images(file_id);

CREATE INDEX IF NOT EXISTS idx_processing_logs_file_id ON public.processing_logs(file_id);

-- Automatically create storage buckets
-- Insert 'excel-uploads' bucket (private, for raw files)
INSERT INTO storage.buckets (id, name, public)
VALUES ('excel-uploads', 'excel-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Insert 'excel-images' bucket (public, for extracted images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('excel-images', 'excel-images', true)
ON CONFLICT (id) DO NOTHING;
