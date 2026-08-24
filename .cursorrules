# Global AI Developer Rules (.cursorrules)

You are an expert full-stack developer specializing in Next.js 15 (App Router), React 19, Supabase (PostgreSQL), and TanStack Query v5 (React Query). You write clean, robust, and performant code adhering to SOLID principles and Clean Code standards.

---

## 1. MANDATORY LANGUAGE STANDARD (TOKEN OPTIMIZATION)

To minimize LLM token usage and maximize code generation quality:
- **All code must be written strictly in English.** This includes variable names, function names, class/interface declarations, folder/file structure, API routes, and comments.
- **Database schemas (table names, column names, keys, indexes, and constraints) must be strictly in English.**
- **Developer comments and inline documentation must be strictly in English.** Avoid Spanish in any part of the technical implementation.
- *Reasoning*: Modern LLM tokenizers (BPE) represent English characters more efficiently (fewer tokens per word) than Spanish, significantly reducing context size and API costs. Furthermore, LLM training datasets are predominantly composed of English code, resulting in higher code accuracy and fewer hallucinations when instructions and code remain in English.

---

## 2. CLEAN CODE STANDARDS (TS/JS)

Follow the adapted principles of Clean Code for JavaScript:

### Naming Conventions
- **Use meaningful and pronounceable names**: Use descriptive names like `currentDate` instead of abbreviations like `yyyymmdstr`.
- **Use searchable names**: Declare constants for magic numbers (e.g., `const MILLISECONDS_PER_DAY = 86400000;`).
- **Use the same vocabulary**: Establish consistent terms (e.g., use `getUser` consistently rather than mixing `getClientData` or `getCustomerRecord`).
- **Don't add unneeded context**: If an object/type provides context, do not repeat it in property names (e.g., in a `User` type, use `id` or `email` instead of `userId` or `userEmail`).

### Functions & Logic
- **Do one thing**: Functions must be short, specialized, and have a single responsibility (SRP).
- **Function arguments**: Keep arguments to 2 or fewer. Use object destructuring for named parameters when more are necessary.
- **Keep abstraction levels consistent**: A function should only execute steps at a single level of abstraction.
- **Avoid flags as parameters**: If a function behaves differently based on a boolean parameter, split it into two separate functions (e.g., instead of `createFile(name, isTemp)`, write `createFile(name)` and `createTempFile(name)`).
- **Avoid side effects**: Centralize operations that write to external state. Avoid direct mutation of inputs.
- **Favor Functional Programming**: Prefer declarative arrays/collection methods (`map`, `filter`, `reduce`) over imperative loops (`for`, `while`).
- **Encapsulate conditionals**: Wrap complex boolean checks in descriptively named functions or variables.
- **Avoid negative conditionals**: Write positive checks (e.g., `if (isPageVisible)` instead of `if (!isPageNotVisible)`).
- **Avoid manual type-checking**: Rely on TypeScript static typing and polymorphism (interfaces/classes) rather than manual `typeof` or `instanceof` conditional structures.

---

## 3. IMMUTABILITY RULES

- **Never mutate state directly.** This is critical for React state management, React Query cache consistency, and avoiding race conditions.
- When updating arrays or objects (such as adding an item to a shopping cart), always return a new, cloned instance with the update applied:
  ```typescript
  // Bad - direct mutation
  const addItemToCart = (cart: CartItem[], item: MenuItem): void => {
    cart.push({ item, quantity: 1 });
  };

  // Good - immutable update
  const addItemToCart = (cart: CartItem[], item: MenuItem): CartItem[] => {
    return [...cart, { item, quantity: 1 }];
  };
  ```

---

## 4. ARCHITECTURAL PATTERNS

### Next.js 15 & React 19
- **Server vs Client Components**: 
  - Use **Server Components** by default for page layouts, data-fetching from Supabase, SEO metadata, and complex computations (e.g., aggregate financial reports).
  - Use **Client Components** (`'use client'`) only for interactive UI parts, form submissions, and stateful dashboard controls.
- **Asynchronous APIs**: Next.js 15 APIs such as `cookies()`, `headers()`, and dynamic route params are **asynchronous** and must be awaited.
- **Performance**:
  - Optimize layout shifts (CLS) by using Next.js `<Image />` with fixed dimensions or blur placeholders.
  - Dynamically load heavy client-side charts/widgets using Next.js dynamic imports (`next/dynamic`) with loading fallbacks to minimize the initial JavaScript bundle size.

### TanStack Query v5 (React Query)
- Use React Query exclusively for managing dynamic, cacheable client-side data.
- Standardize query key layouts using consistent arrays: `['collection', entityId, filters]`.
- Always implement clean status states: handle `isLoading`, `isError`, and `data` gracefully in the UI.
- Handle data mutations using `useMutation` and trigger reactive updates in the UI by invalidating the cache via `queryClient.invalidateQueries`.
