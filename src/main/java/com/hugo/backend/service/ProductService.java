package com.hugo.backend.service;

import com.hugo.backend.model.Product;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class ProductService {

    private final Map<Long, Product> products = new HashMap<>();
    private final AtomicLong sequence = new AtomicLong(0);

    public List<Product> findAll() {
        return new ArrayList<>(products.values());
    }

    public Optional<Product> findById(Long id) {
        return Optional.ofNullable(products.get(id));
    }

    public Product create(Product product) {
        Long id = sequence.incrementAndGet();
        product.setId(id);
        products.put(id, product);
        return product;
    }

    public Optional<Product> update(Long id, Product updated) {
        Product existing = products.get(id);
        if (existing == null) {
            return Optional.empty();
        }
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setPrice(updated.getPrice());
        existing.setStock(updated.getStock());
        return Optional.of(existing);
    }

    public boolean delete(Long id) {
        return products.remove(id) != null;
    }
}
