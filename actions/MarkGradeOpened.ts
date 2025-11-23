"use server";

import prisma from "@/lib/db";
import { verifySession } from "@/lib/sessions";
import { revalidatePath } from "next/cache";

export async function markGradeAsOpened(code: string): Promise<void> {
    const session = await verifySession();
    if(!session.username) return;

    const user = await prisma.user.findUnique({ where: { username: session.username }});
    if(!user) return;

    await prisma.grade.updateMany({
        where: {
            userId: user.id,
            code: code,
        },
        data: {
            opened: true,
        },
    });

    revalidatePath("/grades");
}

export async function markAllGradesAsOpened() {
  const session = await verifySession();
  if (!session.username) return;

  const user = await prisma.user.findUnique({ where: { username: session.username } });
  if (!user) return;

  await prisma.grade.updateMany({
    where: {
      userId: user.id,
      opened: false, 
    },
    data: {
      opened: true,
    },
  });

  revalidatePath('/grades');
}

export async function markGradeAsNew(code: string): Promise<void> {
    const session = await verifySession();
    if(!session.username) return;

    const user = await prisma.user.findUnique({ where: { username: session.username }});
    if(!user) return;

    await prisma.grade.updateMany({
        where: { userId: user.id, opened: true, code: code },
        data: { opened: false },
    })
}