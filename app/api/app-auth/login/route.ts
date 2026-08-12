import { NextRequest, NextResponse } from 'next/server';
import { findOne } from '@/lib/database';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { email, password, projectId } = await request.json();

        // Validate input
        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'Email and password required' },
                { status: 400 }
            );
        }

        // Find user
        const result = await findOne('app_users', { email, project_id: projectId || 'default' });

        if (!result.data) {
            return NextResponse.json(
                { success: false, error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Verify password
        const isValid = await bcrypt.compare(password, (result.data as any).password_hash);

        if (!isValid) {
            return NextResponse.json(
                { success: false, error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Return user data (excluding password)
        return NextResponse.json({
            success: true,
            user: {
                id: (result.data as any).id,
                email: (result.data as any).email,
                name: (result.data as any).name,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
