"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
	Form,
	FormField,
	FormItem,
	FormControl,
	clearFormDraft,
} from "@/components/ui/form";
import type { FeedbackEntry } from "../types";

const PERSIST_KEY = "feedback-draft";
const HISTORY_KEY = "feedback-history";
const MAX_HISTORY = 20;

interface FeedbackFormValues {
	message: string;
}

function readHistory(): FeedbackEntry[] {
	try {
		const stored = localStorage.getItem(HISTORY_KEY);
		return stored ? (JSON.parse(stored) as FeedbackEntry[]) : [];
	} catch {
		return [];
	}
}

function writeHistory({ entries }: { entries: FeedbackEntry[] }): void {
	try {
		localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
	} catch {
		// localStorage may be full or unavailable
	}
}

function useFeedback() {
	const [entries, setEntries] = useState<FeedbackEntry[]>(readHistory);
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function submit({
		values,
		onSuccess,
	}: {
		values: FeedbackFormValues;
		onSuccess: () => void;
	}) {
		if (isSubmitting) return;
		setIsSubmitting(true);

		try {
			const res = await fetch("/api/feedback", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(values),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.error ?? "Failed to submit");
			}

			const { entry } = await res.json();
			const next = [entry, ...entries].slice(0, MAX_HISTORY);
			setEntries(next);
			writeHistory({ entries: next });
			onSuccess();
			toast.success("Feedback sent");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to send feedback",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return { entries, isSubmitting, submit };
}

export function FeedbackPopover() {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" className="h-8">
					Send feedback
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-0">
				<FeedbackPopoverContent onClose={() => setOpen(false)} />
			</PopoverContent>
		</Popover>
	);
}

function FeedbackPopoverContent({ onClose }: { onClose: () => void }) {
	const { entries, isSubmitting, submit } = useFeedback();

	const form = useForm<FeedbackFormValues>({
		defaultValues: { message: "" },
	});

	async function handleSubmit(values: FeedbackFormValues) {
		await submit({
			values,
			onSuccess: () => {
				form.reset({ message: "" });
				clearFormDraft({ key: PERSIST_KEY });
				onClose();
			},
		});
	}

	return (
		<div className="flex flex-col">
			<Form persistKey={PERSIST_KEY} {...form}>
				<form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col">
					<FormField
						control={form.control}
						name="message"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Textarea
										placeholder="Thoughts, bugs, ideas..."
										className="min-h-[7rem] text-sm p-3 bg-background shadow-none border-none! resize-none"
										{...field}
									/>
								</FormControl>
							</FormItem>
						)}
					/>
					<div className="flex justify-end border-t px-3 py-2 gap-2">
						{!form.watch("message").trim() && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={onClose}
							>
								Cancel
							</Button>
						)}
						<Button
							type="submit"
							size="sm"
							disabled={isSubmitting || !form.watch("message").trim()}
						>
							{isSubmitting ? <Spinner /> : "Send"}
						</Button>
					</div>
				</form>
			</Form>

			{entries.length > 0 && (
				<div className="border-t">
					<div className="px-3 py-2">
						<span className="text-xs font-medium text-muted-foreground">
							Previous feedback
						</span>
					</div>
					<div className="max-h-48 overflow-y-auto px-3 pb-3">
						<div className="flex flex-col gap-2">
							{entries.map((entry) => (
								<FeedbackEntryItem key={entry.id} entry={entry} />
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function FeedbackEntryItem({ entry }: { entry: FeedbackEntry }) {
	const formatted = new Date(entry.createdAt).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});

	return (
		<div className="rounded-md border px-2.5 py-2">
			<p className="text-sm whitespace-pre-wrap break-words">{entry.message}</p>
			<span className="mt-1 block text-xs text-muted-foreground">
				{formatted}
			</span>
		</div>
	);
}
