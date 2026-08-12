import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { Project, Page, VisualElement } from '@/lib/visual-builder-types';

// Initialize visual-builder tables on first use
function initializeTables() {
    // Create projects table
    db.createTable('vb_projects', [
        { name: 'id', type: 'INTEGER', constraints: 'PRIMARY KEY' },
        { name: 'name', type: 'TEXT' },
        { name: 'current_page_id', type: 'TEXT' },
        { name: 'created_at', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
    ]);

    // Create pages table
    db.createTable('vb_pages', [
        { name: 'id', type: 'TEXT', constraints: 'PRIMARY KEY' },
        { name: 'project_id', type: 'INTEGER' },
        { name: 'name', type: 'TEXT' },
        { name: 'elements', type: 'TEXT' }, // JSON string
        { name: 'created_at', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT' },
    ]);
}

// GET - Fetch projects or specific project with pages
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    try {
        initializeTables();

        if (projectId) {
            // Get specific project with all pages
            const projectResult = db.getById('vb_projects', projectId);
            if (!projectResult.success || !projectResult.data) {
                return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
            }

            const pagesResult = db.getAll('vb_pages', 1000);
            const pages = pagesResult.success && pagesResult.data
                ? pagesResult.data
                    .filter((p: any) => p.project_id == projectId)
                    .map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        elements: JSON.parse(p.elements || '[]'),
                        createdAt: new Date(p.created_at),
                        updatedAt: new Date(p.updated_at),
                    }))
                : [];

            const project: Project = {
                id: String((projectResult.data as any).id),
                name: (projectResult.data as any).name,
                pages,
                currentPageId: (projectResult.data as any).current_page_id,
            };

            return NextResponse.json({ success: true, data: project });
        } else {
            // Get all projects
            const projectsResult = db.getAll('vb_projects', 100);
            if (!projectsResult.success) {
                return NextResponse.json(projectsResult, { status: 500 });
            }

            const projects = (projectsResult.data || []).map((p: any) => ({
                id: String(p.id),
                name: p.name,
                currentPageId: p.current_page_id,
                createdAt: p.created_at,
                updatedAt: p.updated_at,
            }));

            return NextResponse.json({ success: true, data: projects });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST - Create new project or update existing
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, project, projectId, page, pageId } = body;

        initializeTables();

        switch (action) {
            case 'create_project': {
                // Create new project with a default page
                const projectData = {
                    name: project.name || 'Untitled Project',
                    current_page_id: 'page-1',
                    updated_at: new Date().toISOString(),
                };

                const projectResult = db.insert('vb_projects', projectData);
                if (!projectResult.success) {
                    return NextResponse.json(projectResult, { status: 500 });
                }

                // Create default page
                const pageData = {
                    id: 'page-1',
                    project_id: projectResult.id,
                    name: 'Home',
                    elements: JSON.stringify([]),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                await db.insert('vb_pages', pageData);

                return NextResponse.json({
                    success: true,
                    data: {
                        id: String(projectResult.id),
                        name: projectData.name,
                        currentPageId: 'page-1',
                    },
                });
            }

            case 'update_project': {
                if (!projectId) {
                    return NextResponse.json({ success: false, error: 'Project ID required' }, { status: 400 });
                }

                const updateData: any = {
                    updated_at: new Date().toISOString(),
                };

                if (project.name) updateData.name = project.name;
                if (project.currentPageId) updateData.current_page_id = project.currentPageId;

                const result = db.update('vb_projects', projectId, updateData);
                return NextResponse.json(result);
            }

            case 'create_page': {
                if (!projectId) {
                    return NextResponse.json({ success: false, error: 'Project ID required' }, { status: 400 });
                }

                const pageData = {
                    id: `page-${Date.now()}`,
                    project_id: projectId,
                    name: page.name || 'New Page',
                    elements: JSON.stringify(page.elements || []),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                const result = db.insert('vb_pages', pageData);
                return NextResponse.json(result);
            }

            case 'update_page': {
                if (!pageId) {
                    return NextResponse.json({ success: false, error: 'Page ID required' }, { status: 400 });
                }

                const updateData: any = {
                    updated_at: new Date().toISOString(),
                };

                if (page.name) updateData.name = page.name;
                if (page.elements !== undefined) updateData.elements = JSON.stringify(page.elements);

                const result = db.update('vb_pages', pageId, updateData);
                return NextResponse.json(result);
            }

            case 'delete_page': {
                if (!pageId) {
                    return NextResponse.json({ success: false, error: 'Page ID required' }, { status: 400 });
                }

                const result = db.deleteRow('vb_pages', pageId);
                return NextResponse.json(result);
            }

            default:
                return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE - Delete project and all its pages
export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (!projectId) {
        return NextResponse.json({ success: false, error: 'Project ID required' }, { status: 400 });
    }

    try {
        initializeTables();

        // Delete all pages of the project
        const pagesResult = db.getAll('vb_pages', 1000);
        if (pagesResult.success && pagesResult.data) {
            const projectPages = pagesResult.data.filter((p: any) => p.project_id == projectId);
            for (const page of projectPages as any[]) {
                db.deleteRow('vb_pages', page.id);
            }
        }

        // Delete the project
        const result = db.deleteRow('vb_projects', projectId);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
