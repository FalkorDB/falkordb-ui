import { Slot } from "@radix-ui/react-slot";
import { ExternalLink, Eye, EyeOff, Info, X } from "lucide-react";
import {
	createContext,
	forwardRef,
	useContext,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	type ComponentPropsWithoutRef,
	type FormEvent,
	type FormHTMLAttributes,
	type HTMLAttributes,
	type LabelHTMLAttributes,
	type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import { Badge } from "@/components/badge";
import { Button, type ButtonProps } from "@/components/button";
import { HintTip } from "@/components/hint-tip";
import { Input } from "@/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Textarea } from "@/components/textarea";

export interface FormFieldContextValue {
	controlId: string;
	descriptionId: string;
	messageId: string;
	error?: ReactNode;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

/** Ids and error state of the enclosing `FormField`, or `null` outside one. */
export const useFormField = () => useContext(FormFieldContext);

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
	/** Marks the control invalid and is what `FormMessage` renders. */
	error?: ReactNode;
	/** The control's id. Generated when omitted. */
	controlId?: string;
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
	({ className, error, controlId, ...props }, ref) => {
		const generated = useId();
		const id = controlId ?? generated;
		const field = useMemo(
			() => ({ controlId: id, descriptionId: `${id}-description`, messageId: `${id}-message`, error }),
			[id, error],
		);

		return (
			<FormFieldContext.Provider value={field}>
				<div ref={ref} className={cn("flex flex-col gap-1", className)} {...props} />
			</FormFieldContext.Provider>
		);
	},
);
FormField.displayName = "FormField";

export interface FormLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
	/** Shows the asterisk. The form checks the value itself, so nothing is set on the control. */
	required?: boolean;
	/** Help text revealed by an info icon beside the label. */
	info?: ReactNode;
	/** Renders `info` in place of the default hint, e.g. to open it on tap on touch screens. */
	renderInfo?: (info: ReactNode) => ReactNode;
	/** Classes for the row that holds the label and the info icon. */
	rowClassName?: string;
}

export const FormLabel = forwardRef<HTMLLabelElement, FormLabelProps>(
	({ className, required = false, info, renderInfo, rowClassName, htmlFor, children, ...props }, ref) => {
		const field = useFormField();

		return (
			// Only a row once there is an icon to sit beside, so a bare label keeps its
			// inline box and line height.
			<div className={cn(info && "flex items-center gap-2", rowClassName)}>
				<label
					ref={ref}
					htmlFor={htmlFor ?? field?.controlId}
					className={cn(field?.error && "text-destructive", className)}
					{...props}
				>
					{required && <span aria-hidden>*</span>} {children}
				</label>
				{info &&
					(renderInfo ? (
						renderInfo(info)
					) : (
						<HintTip trigger={<Info className="size-5" aria-hidden />}>{info}</HintTip>
					))}
			</div>
		);
	},
);
FormLabel.displayName = "FormLabel";

export type FormControlProps = ComponentPropsWithoutRef<typeof Slot>;

/** Wires the single child control to the field's id, description and error. */
export const FormControl = forwardRef<HTMLElement, FormControlProps>((props, ref) => {
	const field = useFormField();

	return (
		<Slot
			ref={ref}
			id={field?.controlId}
			aria-describedby={field?.error ? `${field.descriptionId} ${field.messageId}` : field?.descriptionId}
			aria-invalid={field?.error ? true : undefined}
			{...props}
		/>
	);
});
FormControl.displayName = "FormControl";

export const FormDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
	({ className, ...props }, ref) => {
		const field = useFormField();

		return (
			<p
				ref={ref}
				id={field?.descriptionId}
				className={cn("text-sm text-muted-foreground", className)}
				{...props}
			/>
		);
	},
);
FormDescription.displayName = "FormDescription";

/** Renders the field error, or its own children when used for a form-level one. */
export const FormMessage = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
	({ className, children, ...props }, ref) => {
		const field = useFormField();
		const body = field?.error ?? children;

		if (!body) return null;

		return (
			<p
				ref={ref}
				id={field?.messageId}
				role="alert"
				className={cn("text-sm text-destructive", className)}
				{...props}
			>
				{body}
			</p>
		);
	},
);
FormMessage.displayName = "FormMessage";

export const FormFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div ref={ref} className={cn("flex justify-end gap-2", className)} {...props} />
	),
);
FormFooter.displayName = "FormFooter";

export interface FieldError {
	message: string;
	/** Return `true` when invalid. `values` holds every field keyed by name, as of this check. */
	condition: (value: string, values: Record<string, string>) => boolean;
}

interface BaseFieldConfig {
	/** Unique key, and the `name` submitted with the control. */
	name: string;
	label: ReactNode;
	value: string;
	/** The control's id. Generated when omitted. */
	id?: string;
	/** Shows the asterisk. Emptiness is only an error if an `errors` rule says so. */
	required?: boolean;
	placeholder?: string;
	description?: ReactNode;
	/** Help text behind an info icon beside the label. */
	info?: ReactNode;
	disabled?: boolean;
	/**
	 * Checked on change, on submit, and whenever the set of fields changes; the
	 * first match is shown. Declaring it also reserves the line the message
	 * appears on, so the form does not jump when one does.
	 */
	errors?: FieldError[];
	/** Names of other fields whose changes re-check this one, for cross-field rules. */
	revalidateWith?: string[];
	link?: { label: string; url: string };
}

export interface TextFieldConfig extends BaseFieldConfig {
	type?: "text" | "email" | "number" | "url";
	onChange: (value: string) => void;
}

export interface PasswordFieldConfig extends BaseFieldConfig {
	type: "password";
	onChange: (value: string) => void;
}

export interface TextareaFieldConfig extends BaseFieldConfig {
	type: "textarea";
	onChange: (value: string) => void;
}

export interface SelectFieldConfig extends BaseFieldConfig {
	type: "select";
	options: (string | { value: string; label: string })[];
	onChange: (value: string) => void;
}

export interface TagFieldConfig extends BaseFieldConfig {
	type: "tag";
	tags: string[];
	onAddTag: (tag: string) => void;
	onRemoveTag: (index: number) => void;
	/** Applied to each typed tag, and to the existing ones when checking for duplicates. */
	normalize?: (tag: string) => string;
}

export interface CustomFieldControlProps {
	id: string;
	invalid: boolean;
	/** Call with the new value so the field is re-checked. */
	onValueChange: (value: string) => void;
}

/** A control the form does not ship, such as a searchable picker. */
export interface CustomFieldConfig extends BaseFieldConfig {
	type: "custom";
	render: (props: CustomFieldControlProps) => ReactNode;
}

export type FieldConfig =
	| TextFieldConfig
	| PasswordFieldConfig
	| TextareaFieldConfig
	| SelectFieldConfig
	| TagFieldConfig
	| CustomFieldConfig;

export interface FormClassNames {
	field?: string;
	label?: string;
	/** Classes for the text-like controls: inputs, the password input and the textarea. */
	control?: string;
	description?: string;
	message?: string;
	/** The reserved slot for the form-level error. */
	error?: string;
	footer?: string;
	tag?: string;
}

const identity = (tag: string) => tag;

function TagInput({
	field,
	id,
	invalid,
	tagClassName,
}: {
	field: TagFieldConfig;
	id: string;
	invalid: boolean;
	tagClassName?: string;
}) {
	const [draft, setDraft] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const normalize = field.normalize ?? identity;

	const commit = (value: string) => {
		const seen = new Set(field.tags.map(normalize));
		value
			.split(",")
			.map((part) => normalize(part.trim()))
			.filter(Boolean)
			.forEach((part) => {
				if (seen.has(part)) return;
				seen.add(part);
				field.onAddTag(part);
			});
		setDraft("");
	};

	return (
		// The whole box is a click target for the input it wraps, which the input
		// itself already exposes to the keyboard.
		<div
			className="flex min-h-[34px] cursor-text flex-wrap items-center gap-1 rounded-lg border border-border bg-input p-1 text-foreground"
			onClick={() => inputRef.current?.focus()}
		>
			{field.tags.map((tag, index) => (
				<Badge
					key={tag}
					variant="secondary"
					className={cn("flex max-w-full items-center gap-1 overflow-hidden px-2 py-0.5", tagClassName)}
				>
					<span className="truncate" title={tag}>
						{tag}
					</span>
					{!field.disabled && (
						<button
							type="button"
							aria-label={`Remove ${tag}`}
							className="shrink-0 hover:text-destructive"
							onClick={(event) => {
								event.stopPropagation();
								field.onRemoveTag(index);
							}}
						>
							<X size={12} aria-hidden />
						</button>
					)}
				</Badge>
			))}
			<input
				ref={inputRef}
				id={id}
				name={field.name}
				className="min-w-[80px] flex-1 bg-transparent p-0.5 text-sm outline-none"
				value={draft}
				placeholder={field.tags.length === 0 ? (field.placeholder ?? "Type and press Enter") : ""}
				disabled={field.disabled}
				aria-invalid={invalid || undefined}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={() => commit(draft)}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === ",") {
						event.preventDefault();
						commit(draft);
					} else if (event.key === "Backspace" && draft === "" && field.tags.length > 0) {
						field.onRemoveTag(field.tags.length - 1);
					}
				}}
			/>
		</div>
	);
}

function FieldControl({
	field,
	invalid,
	controlClassName,
	tagClassName,
	onValueChange,
}: {
	field: FieldConfig;
	invalid: boolean;
	controlClassName?: string;
	tagClassName?: string;
	onValueChange: (value: string) => void;
}) {
	const [revealed, setRevealed] = useState(false);
	// Always rendered inside the field's `FormField`, which owns the id.
	const { controlId: id } = useFormField() as FormFieldContextValue;

	if (field.type === "tag")
		return <TagInput field={field} id={id} invalid={invalid} tagClassName={tagClassName} />;
	if (field.type === "custom") return <>{field.render({ id, invalid, onValueChange })}</>;

	const change = (value: string) => {
		field.onChange(value);
		onValueChange(value);
	};

	if (field.type === "select") {
		return (
			<Select value={field.value} onValueChange={change} disabled={field.disabled}>
				<FormControl>
					<SelectTrigger name={field.name}>
						<SelectValue placeholder={field.placeholder} />
					</SelectTrigger>
				</FormControl>
				<SelectContent>
					{field.options.map((option) => {
						const { value, label } = typeof option === "string" ? { value: option, label: option } : option;
						return (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						);
					})}
				</SelectContent>
			</Select>
		);
	}

	const shared = {
		name: field.name,
		value: field.value,
		placeholder: field.placeholder,
		disabled: field.disabled,
		"aria-required": field.required || undefined,
		onChange: (event: { target: { value: string } }) => change(event.target.value),
	};

	if (field.type === "textarea") {
		return (
			<FormControl>
				<Textarea {...shared} className={controlClassName} />
			</FormControl>
		);
	}

	if (field.type !== "password") {
		return (
			<FormControl>
				<Input {...shared} type={field.type ?? "text"} className={cn("w-full", controlClassName)} />
			</FormControl>
		);
	}

	return (
		<>
			{/* Before the input, so it is not what Tab lands on after typing a password. */}
			<Button
				variant="none"
				size="none"
				className="absolute right-2 top-2 z-10"
				disabled={field.disabled}
				onClick={() => setRevealed((previous) => !previous)}
			>
				{revealed ? (
					<Eye className="text-foreground" aria-hidden />
				) : (
					<EyeOff className="text-foreground" aria-hidden />
				)}
				<span className="sr-only">{revealed ? "Hide password" : "Show password"}</span>
			</Button>
			<FormControl>
				<Input
					{...shared}
					type={revealed ? "text" : "password"}
					className={cn("w-full pr-10", controlClassName)}
				/>
			</FormControl>
		</>
	);
}

export interface FormSubmitRenderProps {
	isLoading: boolean;
	disabled: boolean;
	label: string;
}

export interface FormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
	fields: FieldConfig[];
	/** Runs only once every field passes its `errors`. */
	onSubmit?: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
	/** Form-level error, shown in a reserved line above the footer. */
	error?: ReactNode;
	submitLabel?: string;
	/** Disables the submit button, e.g. while a form-level error stands. */
	submitDisabled?: boolean;
	/** Extra props for the default submit button, such as an `id`. */
	submitProps?: Omit<ButtonProps, "type" | "isLoading" | "disabled">;
	/** Replaces the default submit button. It must stay `type="submit"`. */
	renderSubmit?: (props: FormSubmitRenderProps) => ReactNode;
	/** Renders a field's `info` in place of the default hint. */
	renderInfo?: (info: ReactNode, field: FieldConfig) => ReactNode;
	/** Footer content, rendered to the left of the submit button. */
	actions?: ReactNode;
	/** Content between the fields and the form-level error, e.g. an optional section. */
	children?: ReactNode;
	classNames?: FormClassNames;
}

const firstError = (field: FieldConfig, value: string, values: Record<string, string>) =>
	field.errors?.find((error) => error.condition(value, values))?.message;

/**
 * A labelled, validated field stack with a submit footer — the FalkorDB Browser
 * form as one component. Fields stay controlled by the caller.
 */
export const Form = forwardRef<HTMLFormElement, FormProps>(
	(
		{
			className,
			fields,
			onSubmit,
			error,
			submitLabel = "Submit",
			submitDisabled = false,
			submitProps,
			renderSubmit,
			renderInfo,
			actions,
			children,
			classNames = {},
			...props
		},
		ref,
	) => {
		const [messages, setMessages] = useState<Record<string, string>>({});
		const [isSubmitting, setIsSubmitting] = useState(false);

		const values = Object.fromEntries(fields.map((field) => [field.name, field.value]));

		// A form that swaps its fields (say, a login form changing mode) re-checks
		// all of them, so a newly shown field that is already wrong says so. Not on
		// mount, though: an untouched form starts clean.
		const fieldsKey = fields.map((field) => field.name).join("\u0000");
		const previousKey = useRef(fieldsKey);
		useEffect(() => {
			if (previousKey.current === fieldsKey) return;
			previousKey.current = fieldsKey;

			setMessages((previous) => {
				const updated = { ...previous };
				fields.forEach((field) => {
					if (!field.errors) return;
					const message = firstError(field, field.value, values);
					if (message) updated[field.name] = message;
					else delete updated[field.name];
				});
				return updated;
			});
			// Keyed on the names alone: values change on every keystroke.
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [fieldsKey]);

		const revalidate = (changed: string, value: string) => {
			const next = { ...values, [changed]: value };
			setMessages((previous) => {
				const updated = { ...previous };
				fields.forEach((field) => {
					if (field.name !== changed && !field.revalidateWith?.includes(changed)) return;
					if (!field.errors) return;
					const message = firstError(field, field.name === changed ? value : field.value, next);
					if (message) updated[field.name] = message;
					else delete updated[field.name];
				});
				return updated;
			});
		};

		const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();

			const found: Record<string, string> = {};
			fields.forEach((field) => {
				const message = firstError(field, field.value, values);
				if (message) found[field.name] = message;
			});
			setMessages(found);

			if (Object.keys(found).length > 0) return;

			try {
				setIsSubmitting(true);
				await onSubmit?.(event);
			} finally {
				setIsSubmitting(false);
			}
		};

		return (
			<form
				ref={ref}
				className={cn("flex w-full flex-col gap-4", className)}
				onSubmit={handleSubmit}
				{...props}
			>
				{fields.map((field) => {
					const message = messages[field.name];
					return (
						<FormField key={field.name} controlId={field.id} error={message} className={classNames.field}>
							<FormLabel
								required={field.required}
								info={field.info}
								renderInfo={renderInfo && ((info) => renderInfo(info, field))}
								className={classNames.label}
							>
								{field.label}
							</FormLabel>
							<div className="relative flex flex-col gap-1">
								<FieldControl
									field={field}
									invalid={!!message}
									controlClassName={classNames.control}
									tagClassName={classNames.tag}
									onValueChange={(value) => revalidate(field.name, value)}
								/>
								{field.description && (
									<FormDescription className={classNames.description}>{field.description}</FormDescription>
								)}
								{field.link && (
									<a
										href={field.link.url}
										target="_blank"
										rel="noopener noreferrer"
										className="flex w-fit items-center gap-1 text-sm text-primary hover:underline"
									>
										{field.link.label}
										<ExternalLink size={14} aria-hidden />
									</a>
								)}
								{field.errors && (
									<div className="h-5">
										<FormMessage className={classNames.message} />
									</div>
								)}
							</div>
						</FormField>
					);
				})}
				{children}
				<div className={cn("min-h-8", classNames.error)}>
					{error &&
						(typeof error === "string" ? (
							<FormMessage className={classNames.message}>{error}</FormMessage>
						) : (
							error
						))}
				</div>
				<FormFooter className={classNames.footer}>
					{actions}
					{renderSubmit ? (
						renderSubmit({ isLoading: isSubmitting, disabled: submitDisabled, label: submitLabel })
					) : (
						<Button
							className="grow justify-center p-4"
							label={submitLabel}
							{...submitProps}
							type="submit"
							disabled={submitDisabled || isSubmitting}
							isLoading={isSubmitting}
						/>
					)}
				</FormFooter>
			</form>
		);
	},
);
Form.displayName = "Form";
