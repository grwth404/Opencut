use proc_macro::TokenStream;
use quote::quote;
use syn::{ItemFn, parse_macro_input};

#[proc_macro_attribute]
pub fn export(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let function = parse_macro_input!(item as ItemFn);
    let js_name = snake_to_camel(&function.sig.ident.to_string());

    quote! {
        #[cfg_attr(feature = "wasm", ::wasm_bindgen::prelude::wasm_bindgen(js_name = #js_name))]
        #function
    }
    .into()
}

fn snake_to_camel(name: &str) -> String {
    let mut camel = String::with_capacity(name.len());
    let mut should_uppercase_next = false;

    for character in name.chars() {
        if character == '_' {
            should_uppercase_next = true;
            continue;
        }

        if should_uppercase_next {
            camel.push(character.to_ascii_uppercase());
            should_uppercase_next = false;
            continue;
        }

        camel.push(character);
    }

    camel
}

#[cfg(test)]
mod tests {
    use super::snake_to_camel;

    #[test]
    fn converts_snake_case_to_camel_case() {
        assert_eq!(snake_to_camel("do_something"), "doSomething");
        assert_eq!(snake_to_camel("a_b_c"), "aBC");
        assert_eq!(snake_to_camel("already"), "already");
    }
}
