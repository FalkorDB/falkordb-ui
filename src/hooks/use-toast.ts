import { useSyncExternalStore, type ReactNode } from "react";

import type { ToastActionElement, ToastProps } from "@/components/toast";

export interface ToasterToast extends Omit<ToastProps, "title" | "id"> {
	id: string;
	title?: ReactNode;
	description?: ReactNode;
	action?: ToastActionElement;
}

export type ToastOptions = Omit<ToasterToast, "id">;

/** How many toasts stay on screen at once. */
const TOAST_LIMIT = 3;
/** Grace period after close so the exit animation can finish before unmount. */
const REMOVE_DELAY_MS = 300;

let toasts: ToasterToast[] = [];
let counter = 0;

const listeners = new Set<() => void>();
const removeTimers = new Map<string, ReturnType<typeof setTimeout>>();

function emit(next: ToasterToast[]) {
	toasts = next;
	listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

const getSnapshot = () => toasts;

function remove(id: string) {
	const timer = removeTimers.get(id);
	if (timer) {
		clearTimeout(timer);
		removeTimers.delete(id);
	}
	emit(toasts.filter((item) => item.id !== id));
}

function scheduleRemove(id: string) {
	if (removeTimers.has(id)) return;
	removeTimers.set(
		id,
		setTimeout(() => remove(id), REMOVE_DELAY_MS),
	);
}

/** Closes a toast, or every toast when no id is given. */
export function dismiss(id?: string) {
	emit(
		toasts.map((item) => {
			if (id !== undefined && item.id !== id) return item;
			scheduleRemove(item.id);
			return { ...item, open: false };
		}),
	);
}

export function toast(options: ToastOptions) {
	counter += 1;
	const id = String(counter);

	const update = (next: Partial<ToastOptions>) => {
		emit(toasts.map((item) => (item.id === id ? { ...item, ...next } : item)));
	};

	emit(
		[
			{
				...options,
				id,
				open: true,
				onOpenChange: (open: boolean) => {
					options.onOpenChange?.(open);
					if (!open) scheduleRemove(id);
				},
			},
			...toasts,
		].slice(0, TOAST_LIMIT),
	);

	return { id, dismiss: () => dismiss(id), update };
}

export function useToast() {
	// Server render has no toasts, so the snapshot is stable there.
	const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
	return { toasts: value, toast, dismiss };
}
