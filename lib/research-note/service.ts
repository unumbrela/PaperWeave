import prisma from '@/lib/db/prisma';
import type { ResearchNote } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export interface CreateResearchNoteData {
  paperId: string;
  title?: string;
  content: string;
}

export interface UpdateResearchNoteData {
  title?: string;
  content?: string;
}

const getLocalNotesDir = () => {
  const dir = path.join(process.cwd(), 'data', 'notes');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const loadNotesFromFile = (paperId: string): any[] => {
  const dir = getLocalNotesDir();
  const filePath = path.join(dir, `${paperId}.json`);
  
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`Failed to load notes from file: ${error}`);
  }
  
  return [];
};

const saveNotesToFile = (paperId: string, notes: any[]): void => {
  const dir = getLocalNotesDir();
  const filePath = path.join(dir, `${paperId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(notes, null, 2));
};

export async function createResearchNote(data: CreateResearchNoteData): Promise<ResearchNote | null> {
  try {
    const existing = await prisma.researchNote.findFirst({
      where: { paperId: data.paperId },
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      return await prisma.researchNote.update({
        where: { id: existing.id },
        data: {
          title: data.title ?? existing.title,
          content: data.content,
          updatedAt: new Date(),
        },
      });
    }

    const note = await prisma.researchNote.create({
      data: {
        paperId: data.paperId,
        title: data.title,
        content: data.content,
      },
    });
    return note;
  } catch {
    const notes = loadNotesFromFile(data.paperId);
    const existingIndex = notes.findIndex((note) => note.paperId === data.paperId);
    if (existingIndex >= 0) {
      const nextNote = {
        ...notes[existingIndex],
        title: data.title ?? notes[existingIndex].title,
        content: data.content,
        updatedAt: new Date().toISOString(),
      };
      notes[existingIndex] = nextNote;
      saveNotesToFile(data.paperId, notes);
      return nextNote as unknown as ResearchNote;
    }

    const newNote = {
      id: `note-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    notes.push(newNote);
    saveNotesToFile(data.paperId, notes);
    return newNote as unknown as ResearchNote;
  }
}

export async function getResearchNotesByPaperId(paperId: string): Promise<ResearchNote[]> {
  try {
    const notes = await prisma.researchNote.findMany({
      where: { paperId },
      orderBy: { createdAt: 'asc' },
    });
    return notes;
  } catch {
    return loadNotesFromFile(paperId) as ResearchNote[];
  }
}

export async function getResearchNoteById(id: string): Promise<ResearchNote | null> {
  try {
    return await prisma.researchNote.findUnique({ where: { id } });
  } catch {
    return null;
  }
}

export async function updateResearchNote(id: string, data: UpdateResearchNoteData): Promise<ResearchNote | null> {
  try {
    return await prisma.researchNote.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  } catch {
    const notesDir = getLocalNotesDir();
    const files = fs.existsSync(notesDir) ? fs.readdirSync(notesDir) : [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const paperId = file.replace(/\.json$/, '');
      const notes = loadNotesFromFile(paperId);
      const index = notes.findIndex((note) => note.id === id);
      if (index >= 0) {
        const nextNote = {
          ...notes[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        notes[index] = nextNote;
        saveNotesToFile(paperId, notes);
        return nextNote as unknown as ResearchNote;
      }
    }
    return null;
  }
}

export async function deleteResearchNote(id: string): Promise<boolean> {
  try {
    await prisma.researchNote.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function deleteResearchNotesByPaperId(paperId: string): Promise<boolean> {
  try {
    await prisma.researchNote.deleteMany({ where: { paperId } });
    return true;
  } catch {
    const dir = getLocalNotesDir();
    const filePath = path.join(dir, `${paperId}.json`);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch (error) {
      console.warn(`Failed to delete notes file: ${error}`);
    }
    return false;
  }
}
