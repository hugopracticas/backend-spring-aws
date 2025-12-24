// package com.hugo.backend.service;

// import com.hugo.backend.model.Product;
// import org.springframework.stereotype.Service;

// import java.util.*;
// import java.util.concurrent.atomic.AtomicLong;

// @Service
// public class ProductService {

// private final Map<Long, Product> products = new HashMap<>();
// private final AtomicLong sequence = new AtomicLong(0);

// public List<Product> findAll() {
// return new ArrayList<>(products.values());
// }

// public Optional<Product> findById(Long id) {
// return Optional.ofNullable(products.get(id));
// }

// public Product create(Product product) {
// Long id = sequence.incrementAndGet();
// product.setId(id);
// products.put(id, product);
// return product;
// }

// public Optional<Product> update(Long id, Product updated) {
// Product existing = products.get(id);
// if (existing == null) {
// return Optional.empty();
// }
// existing.setName(updated.getName());
// existing.setDescription(updated.getDescription());
// existing.setPrice(updated.getPrice());
// existing.setStock(updated.getStock());
// return Optional.of(existing);
// }

// public boolean delete(Long id) {
// return products.remove(id) != null;
// }
// }

package com.hugo.backend.service;

import com.hugo.backend.model.Product;
import com.hugo.backend.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ProductService {

    private final ProductRepository repo;

    public ProductService(ProductRepository repo) {
        this.repo = repo;
    }

    public List<Product> findAll() {
        return repo.findAll();
    }

    public Optional<Product> findById(Long id) {
        return repo.findById(id);
    }

    public Product create(Product product) {
        return repo.save(product);
    }

    public Optional<Product> update(Long id, Product product) {
        return repo.findById(id).map(existing -> {
            existing.setName(product.getName());
            existing.setDescription(product.getDescription());
            existing.setPrice(product.getPrice());
            existing.setStock(product.getStock());
            return repo.save(existing);
        });
    }

    public boolean delete(Long id) {
        if (!repo.existsById(id))
            return false;
        repo.deleteById(id);
        return true;
    }
}
