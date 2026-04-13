import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type TicketStatus = "open" | "in_progress" | "resolved";
export type TicketPriority = "low" | "high";

export interface Ticket {
  id: string;
  userEmail: string;
  issue: string;
  status: TicketStatus;
  priority: TicketPriority | null;
  createdAt: Timestamp | null;
}

export interface CreateTicketInput {
  userEmail: string;
  issue: string;
}

const COLLECTION = "tickets";

export async function createTicket(input: CreateTicketInput): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    userEmail: input.userEmail,
    issue: input.issue,
    status: "open" as TicketStatus,
    priority: null,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTicketPriority(
  id: string,
  priority: TicketPriority
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { priority });
}

export async function getAllTickets(): Promise<Ticket[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Ticket, "id">),
  }));
}
